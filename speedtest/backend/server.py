"""APEN Speed Test — async server (FastAPI + uvicorn).

Re-platformed from the stdlib http.server (single-threaded, HTTP/1.0, no
keep-alive) onto the same async ASGI stack the NetDiag apps use. Benefits:
  * HTTP/1.1 keep-alive by default — no fresh TCP handshake per request, so
    latency and throughput are measured accurately on real links.
  * Genuine concurrency — many parallel measurement streams are served at once.
  * Downloads stream from a pre-generated random buffer (no per-request CPU to
    synthesise megabytes of randomness); uploads are drained as a stream without
    buffering the whole body in memory.

Endpoint paths, the IP allow-gate, logging, static serving and the
`speedtest-server` console-script entrypoint are all preserved.
"""
from __future__ import annotations

import ipaddress
import os
import sys
import traceback
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse
from starlette.background import BackgroundTask  # noqa: F401  (kept for parity)

import backend.config as config
from backend.utils import setup_logging, log_access, log_error

HOST = config.HOST
PORT = config.PORT

# Frontend bundle: env override (packaged/Docker) else repo-relative ../frontend.
FRONTEND_DIR = Path(
    os.getenv("SPEEDTEST_FRONTEND_DIR", str(Path(__file__).resolve().parent.parent / "frontend"))
).resolve()

# Output streaming granularity and a reusable random payload. Random content is
# generated ONCE; reusing it defeats nothing (it is opaque to the client) while
# avoiding os.urandom on every request under many parallel streams.
_OUT_CHUNK = 256 * 1024
_RAND = os.urandom(max(_OUT_CHUNK, 1 << 20))  # 1 MiB reusable buffer
_MAX_DOWNLOAD = 64 * 1024 * 1024              # hard cap per request

seen_ping_ips: set[str] = set()


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"


def _authorized(ip: str) -> bool:
    if getattr(config, "ALLOW_ALL", False):
        return True
    try:
        ip_obj = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return any(ip_obj in net for net in config.AUTHORIZED_NETWORKS)


def _require_auth(request: Request) -> str:
    ip = _client_ip(request)
    if not _authorized(ip):
        raise HTTPException(status_code=403, detail="Forbidden")
    return ip


def _no_store(extra: dict | None = None) -> dict:
    h = {"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
         "Pragma": "no-cache", "Expires": "0"}
    if extra:
        h.update(extra)
    return h


app = FastAPI(title="APEN Speed Test")


@app.exception_handler(HTTPException)
async def _http_exc(request: Request, exc: HTTPException):
    # Preserve the original JSON error shape ({"error": ...}).
    msg = "Forbidden" if exc.status_code == 403 else (exc.detail or "Error")
    return JSONResponse({"error": msg}, status_code=exc.status_code, headers=_no_store())


# -- public bootstrap -------------------------------------------------------
@app.get("/speedtest/api/config")
async def st_config():
    return JSONResponse({
        "PING_COUNT": config.PING_COUNT,
        "CHUNK_SIZE": config.CHUNK_SIZE,
        "DOWNLOAD_SIZE": config.DOWNLOAD_SIZE,
        "PHASE_TIME_MS": int(config.TIMEOUT_SECONDS * 1000),
        "STREAMS": config.STREAMS,
        "WARMUP_MS": config.WARMUP_MS,
        "ENDPOINTS": {
            "ping": "/speedtest/api/ping",
            "download": "/speedtest/api/download",
            "upload": "/speedtest/api/upload",
            "results": "/speedtest/api/results",
        },
    }, headers=_no_store())


# -- measurement endpoints (auth-gated) -------------------------------------
@app.get("/speedtest/api/ping")
async def st_ping(request: Request):
    ip = _require_auth(request)
    if ip not in seen_ping_ips:
        seen_ping_ips.add(ip)
        log_access(f"{ip} - - GET /speedtest/api/ping")
    return JSONResponse({"ts": ""}, headers=_no_store())


@app.get("/speedtest/api/download")
async def st_download(request: Request, chunks: int = 1, size: int = 1024):
    _require_auth(request)
    try:
        chunks = max(1, min(int(chunks), 4096))
        size = max(1, min(int(size), _MAX_DOWNLOAD))
        total = min(size * chunks, _MAX_DOWNLOAD)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid parameters")

    async def gen():
        sent = 0
        buf = _RAND
        n = len(buf)
        while sent + n <= total:
            yield buf
            sent += n
        if sent < total:
            yield buf[: total - sent]

    return StreamingResponse(gen(), media_type="application/octet-stream",
                             headers=_no_store({"Content-Length": str(total)}))


@app.post("/speedtest/api/upload")
async def st_upload(request: Request):
    _require_auth(request)
    total = 0
    async for chunk in request.stream():   # drain without buffering whole body
        total += len(chunk)
    return JSONResponse({"received": total}, headers=_no_store())


@app.post("/speedtest/api/results")
async def st_results(request: Request):
    ip = _require_auth(request)
    try:
        data = await request.json()
        log_access(f"{ip} - - TEST RESULTS {data}")
        return JSONResponse({"ok": True}, headers=_no_store())
    except Exception as e:  # noqa: BLE001
        log_error(f"Results error: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON")


# -- static frontend (public; declared AFTER the api routes) ----------------
def _serve(rel: str) -> Response:
    candidate = (FRONTEND_DIR / rel).resolve()
    try:
        candidate.relative_to(FRONTEND_DIR)
    except ValueError:
        raise HTTPException(status_code=404, detail="Not found")
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    import mimetypes
    ctype, _ = mimetypes.guess_type(str(candidate))
    return Response(content=candidate.read_bytes(),
                    media_type=ctype or "application/octet-stream", headers=_no_store())


@app.get("/favicon.ico")
async def favicon():
    return _serve("favicon.ico")


@app.get("/favicon.png")
async def favicon_png():
    return _serve("favicon.png")


@app.get("/")
@app.get("/index.html")
@app.get("/speedtest")
@app.get("/speedtest/")
@app.get("/speedtest/index.html")
async def index():
    return _serve("index.html")


@app.get("/speedtest/{asset:path}")
async def asset(asset: str):
    # api/* paths are matched by the explicit routes above (registered first).
    return _serve(asset)


# -- launcher ---------------------------------------------------------------
def run_server():
    setup_logging()
    log_access(f"SpeedTest server starting on host {HOST} port {PORT}")
    try:
        import uvicorn
        print(f"Serving WebUI backend and static frontend on {HOST}:{PORT}", flush=True)
        log_access("SpeedTest server successfully started")
        uvicorn.run(app, host=HOST, port=PORT, log_level="warning")
    except Exception as e:  # noqa: BLE001
        log_error("SpeedTest server failed to start or crashed:\n" + traceback.format_exc())
        raise


if __name__ == "__main__":
    try:
        run_server()
    except Exception:  # noqa: BLE001
        log_error("Fatal error in main:\n" + traceback.format_exc())
        raise
