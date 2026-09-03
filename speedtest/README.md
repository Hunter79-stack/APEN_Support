# SpeedTest

A self-hosted, custom-built network speed test. The application measures
latency, download throughput, and upload throughput between a browser and this
server using only code this project owns — no delegation to `speedtest-cli`,
`iperf`, or similar external tools.

The backend is a single Python process built on the standard-library
`http.server`. The frontend is a small static HTML/CSS/JS bundle served by the
same process.

---

## How the app produces accurate results

A full test runs three sequential phases, orchestrated by `frontend/speedtest.js`:

1. **Latency / Jitter** — The browser issues `PING_COUNT` back-to-back requests
   to `/speedtest/api/ping`, timing each round-trip with
   `performance.now()`. Min, average, max, and jitter (stddev) are computed
   client-side.
2. **Download** — The browser repeatedly fetches `/speedtest/api/download` for
   `PHASE_TIME_MS` milliseconds. Each response is freshly generated random
   bytes from `os.urandom`, so nothing along the path can compress or cache the
   payload. Bytes transferred are divided by wall-clock time to yield Mbps.
3. **Upload** — The browser POSTs random-chunk payloads to
   `/speedtest/api/upload` until the phase deadline. The server echoes the
   byte count it received; the browser divides total bytes by elapsed time.

Accuracy safeguards:

- `os.urandom` payload (download) defeats compression and caches.
- No-cache response headers + no-cache fetch options in the browser.
- Authorized-network gating keeps the test path free of untrusted traffic.
- Timings come from `time.perf_counter` on the server and
  `performance.now()` in the browser — both are monotonic high-resolution clocks.
- The measurement logic is in-repo: `backend/speedtest.py` and
  `frontend/speedtest.js`. No external speed-test binaries are invoked.

---

## Installation requirements

- **OS** — Linux (developed on Ubuntu; any POSIX with Python 3.9+ should work).
- **Python** — 3.9 or newer (tested on 3.12).
- **Dependencies** — see `requirements.txt`. The backend and WebUI depend only
  on the Python standard library; the listed packages (`requests`, `pytest`)
  are used solely by the test harness.

---

## Build & install

Install in development mode from the repo root:

```bash
pip install -r requirements.txt
pip install -e .
```

Or build a wheel and install it:

```bash
pip install build
python -m build
pip install dist/speedtest-0.1.0-py3-none-any.whl
```

Installing the package exposes a console script:

```bash
speedtest-server
```

---

## Running the server

From the repo root without installing:

```bash
python -m backend.server
```

After `pip install`:

```bash
speedtest-server
```

Then open `http://<host>:8083/` in a browser on an authorized network (see
`backend/config.py`).

### Environment overrides

| Variable                  | Default     | Meaning                            |
| ------------------------- | ----------- | ---------------------------------- |
| `SPEEDTEST_HOST`          | `0.0.0.0`   | Listen address                     |
| `SPEEDTEST_PORT`          | `8083`      | Listen port                        |
| `SPEEDTEST_PING_COUNT`    | `10`        | Number of latency samples          |
| `SPEEDTEST_CHUNK_SIZE`    | `1048576`   | Bytes per transfer chunk (1 MiB)   |
| `SPEEDTEST_TIMEOUT`       | `15.0`      | Seconds per download/upload phase  |

### Docker / Docker Compose

A ready-to-run `Dockerfile` and `docker-compose.yaml` live at the repo root.

```bash
# Build and start the stack in the background
docker compose up -d --build

# Follow logs
docker compose logs -f speedtest

# Stop
docker compose down
```

The compose file exposes the WebUI at `http://<host>:8083/` by default, or
whatever port you set with `SPEEDTEST_PORT` in your host environment.

**Volumes (bind mounts)**

- `./logs` → `/app/logs` — persistent access/error/test logs survive
  restarts and can be tailed from the host.
- `./frontend/favicon.ico` → `/app/frontend/favicon.ico` (read-only) —
  replace `./frontend/favicon.ico` on the host with your own `.ico` and
  run `docker compose restart speedtest` to rebrand the WebUI without
  rebuilding the image.

**Container details**

- Multi-stage `python:3.12-slim` build; final image runs as the non-root
  `speedtest` user.
- Entrypoint is the `speedtest-server` console script installed from
  `pyproject.toml`, so the container behaves identically to a native
  `pip install`.
- The built-in healthcheck only uses the Python standard library, so no
  extra packages are added to the slim runtime.

### systemd (optional)

A minimal unit might look like:

```ini
[Unit]
Description=SpeedTest Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/projects/speedtest
ExecStart=/usr/bin/python3 -m backend.server
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

---

## Running the CLI tests

The test suite lives in `tests/` and uses `pytest`.

- **Unit tests** (no running server needed):
  - `tests/test_utils.py`
  - `tests/test_speedtest.py`
  - `tests/test_logging.py`
- **Endpoint tests** (require the server to be running on
  `127.0.0.1:$SPEEDTEST_PORT`):
  - `tests/test_api.py`, `tests/test_config_endpoint.py`,
    `tests/test_ping_endpoint.py`, `tests/test_download_endpoint.py`,
    `tests/test_upload_endpoint.py`, `tests/test_results_endpoint.py`,
    `tests/test_verify_download.py`, `tests/test_verify_upload.py`,
    `tests/test_auth.py`

Typical invocation:

```bash
# Terminal 1 — start the server
python -m backend.server

# Terminal 2 — run the suite
pytest

# Unit tests only
pytest tests/test_utils.py tests/test_speedtest.py tests/test_logging.py
```

Every test writes a PASS/FAIL line to `logs/test_results.log` via
`tests/conftest.py::record_test_result`. Diagnostics for the current run land
in `logs/test_runs.log`, which is wiped at the start of every session.

---

## Log files

All log files live in `logs/` at the repo root and are created automatically on
first use.

| File                    | Written by     | Content                                              | Audience         |
| ----------------------- | -------------- | ---------------------------------------------------- | ---------------- |
| `logs/access.log`       | backend        | Startup line, first-seen pings, posted result JSON   | IA audits        |
| `logs/errors.log`       | backend        | Crashes, uncaught exceptions, 4xx/5xx handler errors | Systems team     |
| `logs/test_runs.log`    | pytest harness | Per-run diagnostics — wiped at session start         | Test debugging   |
| `logs/test_results.log` | pytest harness | Persistent PASS/FAIL ledger across all sessions      | IA audit trail   |

Each log file has its own dedicated Python logger, configured by
`backend/utils.py::setup_all_logs()`. The backend never writes to the test
logs and the tests never write to the backend logs — any cross-writes indicate
a bug.

---

## Troubleshooting

- **`403 Forbidden` for every request** — your client IP is not in
  `backend/config.py::AUTHORIZED_NETWORKS`. Either run from an authorized
  subnet, add your subnet to the list, or (for local testing) hit the server
  from `127.0.0.1`.
- **`OSError: [Errno 98] Address already in use`** — another process holds
  port `8083`. Stop it or set `SPEEDTEST_PORT` to a free port.
- **Endpoint tests fail with connection-refused** — start the server
  (`python -m backend.server`) in another terminal before running `pytest`.
- **No logs appear** — verify `logs/` is writable by the user running the
  server. `setup_all_logs()` will raise if `logs/` exists but is not a
  directory.

---

## Repository layout

```
speedtest/
├── CLAUDE.md                 # Project contract followed by Claude Code
├── APPLICATION_OVERVIEW.md   # File-by-file inventory of the code
├── CHANGELOG.md              # Append-only change record
├── README.md                 # You are here
├── requirements.txt          # Pinned third-party dependencies
├── pyproject.toml            # Packaging / build metadata
├── Dockerfile                # Multi-stage container image
├── docker-compose.yaml       # Compose stack definition
├── .dockerignore             # Build-context exclusions
├── backend/                  # Server package (config, server, speedtest, utils)
├── frontend/                 # Static WebUI (html/css/js + favicon)
├── tests/                    # Pytest suite
└── logs/                     # Runtime log output (auto-created)
```
