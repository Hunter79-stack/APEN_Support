import os
import time
import logging
from datetime import datetime
from pathlib import Path

try:
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover
    ZoneInfo = None

# Timezone for all log timestamps (override with SPEEDTEST_TZ). Defaults to
# America/New_York so the server's logged time matches the other apps.
LOG_TZ = os.getenv("SPEEDTEST_TZ", "America/New_York")


def _tz_converter(secs=None):
    """logging.Formatter.converter — render asctime in LOG_TZ on any platform."""
    if ZoneInfo is not None:
        try:
            tz = ZoneInfo(LOG_TZ)
            dt = datetime.fromtimestamp(secs, tz) if secs is not None else datetime.now(tz)
            return dt.timetuple()
        except Exception:  # pragma: no cover
            pass
    return time.localtime(secs)

# Log file paths.
#
# BASE_DIR is the directory that contains the `backend/` package on disk. That
# works for developers running from a cloned repo where `logs/` sits alongside
# `backend/`, but it is WRONG for packaged installs (e.g. the Docker image,
# which `pip install`s the backend into /usr/local/lib/.../site-packages/):
# the computed LOG_DIR would then be /usr/local/lib/.../site-packages/logs,
# which the non-root runtime user cannot create.
#
# To keep the source-tree convenience while supporting packaged installs, the
# effective log directory is resolved in this order:
#   1. SPEEDTEST_LOG_DIR environment variable (absolute path).
#   2. BASE_DIR / "logs" (classic repo-relative default).
BASE_DIR          = Path(__file__).resolve().parent.parent
LOG_DIR           = Path(os.getenv("SPEEDTEST_LOG_DIR", str(BASE_DIR / "logs")))
ACCESS_LOG        = LOG_DIR / "access.log"
ERROR_LOG         = LOG_DIR / "errors.log"
TEST_RUN_LOG      = LOG_DIR / "test_runs.log"
TEST_RESULTS_LOG  = LOG_DIR / "test_results.log"

def ensure_logging_structure():
    """
    Ensure the logs directory exists and that all four log files are created.
    """
    if LOG_DIR.exists():
        if not LOG_DIR.is_dir():
            raise NotADirectoryError(f"{LOG_DIR!r} exists but is not a directory")
    else:
        LOG_DIR.mkdir(parents=True, exist_ok=True)

    for log_path in (ACCESS_LOG, ERROR_LOG, TEST_RUN_LOG, TEST_RESULTS_LOG):
        if not log_path.exists():
            log_path.touch()

def _configure_logger(name: str, path: Path, level: int, fmt: str):
    """
    Create or reconfigure a named logger to write to the given file path.
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Remove old handlers
    for h in list(logger.handlers):
        logger.removeHandler(h)

    handler = logging.FileHandler(path, mode="a", encoding="utf-8")
    handler.setLevel(level)
    formatter = logging.Formatter(fmt)
    formatter.converter = _tz_converter   # timestamps in LOG_TZ (America/New_York)
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger

def init_access_logging():
    """
    Initialize the access log handler.
    """
    return _configure_logger(
        name="access",
        path=ACCESS_LOG,
        level=logging.INFO,
        fmt="%(asctime)s %(message)s"
    )

def init_error_logging():
    """
    Initialize the error log handler.
    """
    return _configure_logger(
        name="error",
        path=ERROR_LOG,
        level=logging.ERROR,
        fmt="%(asctime)s %(levelname)s: %(message)s"
    )

def init_test_run_logging():
    """
    Initialize the test runs log handler.
    """
    return _configure_logger(
        name="test_run",
        path=TEST_RUN_LOG,
        level=logging.INFO,
        fmt="%(asctime)s %(message)s"
    )

def init_test_results_logging():
    """
    Initialize the test results log handler.
    """
    return _configure_logger(
        name="test_results",
        path=TEST_RESULTS_LOG,
        level=logging.INFO,
        fmt="%(asctime)s %(message)s"
    )

def setup_all_logs():
    """
    Call once at server startup or test-harness setup to:
      1. Create the logs directory and files.
      2. Initialize all four loggers.
    """
    ensure_logging_structure()
    init_access_logging()
    init_error_logging()
    init_test_run_logging()
    init_test_results_logging()

# backward compatibility
setup_logging = setup_all_logs

def log_access(message: str):
    """
    Write an info message to access.log
    """
    logging.getLogger("access").info(message)

def log_error(message: str):
    """
    Write an error message to errors.log
    """
    logging.getLogger("error").error(message)

def log_test_run(message: str):
    """
    Write an info message to test_runs.log
    """
    logging.getLogger("test_run").info(message)

def log_test_result(message: str):
    """
    Write an info message to test_results.log
    """
    logging.getLogger("test_results").info(message)

class Timer:
    """
    Context manager for measuring elapsed wall-clock time.
    Usage:
        with Timer() as t:
            do_work()
        print(t.elapsed)
    """
    def __enter__(self):
        self.start = time.monotonic()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed = time.monotonic() - self.start

def get_random_buffer(size: int) -> bytes:
    """
    Return a bytes object of length 'size' filled with random data.
    """
    return os.urandom(size)

def bytes_to_mbps(byte_count: int, elapsed_sec: float) -> float:
    """
    Convert bytes and elapsed seconds into megabits per second.
    """
    return (byte_count * 8) / (elapsed_sec * 1_000_000)
