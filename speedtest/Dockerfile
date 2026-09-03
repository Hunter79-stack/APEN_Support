# syntax=docker/dockerfile:1.6
#
# APEN Speed Test — container image.
#
# Philosophy: the backend is built on the Python standard library, so the
# runtime image stays small. Only the pinned requirements.txt entries
# (requests, pytest) get installed, and only inside a build stage so the
# final image does not carry pip cache or build tooling.
#

ARG PYTHON_VERSION=3.12-slim

# -----------------------------------------------------------------------------
# Builder stage — install the project as a wheel into a throw-away layer.
# -----------------------------------------------------------------------------
FROM python:${PYTHON_VERSION} AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

# Copy only the files needed to resolve + install deps first, for cache-friendly
# rebuilds when source changes but dependencies do not.
COPY requirements.txt pyproject.toml ./
COPY backend/ ./backend/

RUN pip install --prefix=/install -r requirements.txt && \
    pip install --prefix=/install .

# -----------------------------------------------------------------------------
# Runtime stage — copy installed site-packages and the static frontend.
# -----------------------------------------------------------------------------
FROM python:${PYTHON_VERSION} AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    SPEEDTEST_HOST=0.0.0.0 \
    SPEEDTEST_PORT=8090 \
    SPEEDTEST_LOG_DIR=/app/logs \
    SPEEDTEST_FRONTEND_DIR=/app/frontend

# Non-root runtime user for the server.
RUN groupadd --system --gid 1000 speedtest && \
    useradd  --system --uid 1000 --gid speedtest --home /app --shell /usr/sbin/nologin speedtest

WORKDIR /app

# Bring in the installed package + console script from the builder.
COPY --from=builder /install /usr/local

# Copy the application bundle. backend/ is also installed as a package above
# (for the console script), but the running server imports `backend.*` from
# this working directory so it picks up live-mounted source during dev.
COPY --chown=speedtest:speedtest backend/  /app/backend/
COPY --chown=speedtest:speedtest frontend/ /app/frontend/
COPY --chown=speedtest:speedtest tests/    /app/tests/
COPY --chown=speedtest:speedtest README.md requirements.txt pyproject.toml /app/

# logs/ is a mount point — the backend will create files inside it at runtime.
# Also scrub any __pycache__/.pyc the COPY may have dragged in from the host
# (they would shadow /usr/local/lib/.../site-packages on sys.path). Without
# this, stale host-side bytecode — even bytecode compiled against a
# different Python version — can silently execute inside the container.
RUN find /app -type d -name '__pycache__' -prune -exec rm -rf {} + && \
    find /app -type f \( -name '*.pyc' -o -name '*.pyo' \) -delete && \
    mkdir -p /app/logs && \
    chown -R speedtest:speedtest /app/logs

USER speedtest

EXPOSE 8090

# Container-local healthcheck uses only the stdlib (no curl in slim image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request, sys; \
sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8090/speedtest/api/config', timeout=3).status == 200 else 1)"

# Launch via the console-script the package installs.
CMD ["speedtest-server"]
