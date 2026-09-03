import sys
import time
import pytest
from pathlib import Path
from datetime import datetime

# Ensure backend is importable
BASE_DIR = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(BASE_DIR))

import backend.config as config
import backend.utils as utils

# Use the real log paths from utils
TEST_RUN_LOG         = utils.TEST_RUN_LOG
TEST_RESULTS_LOG     = utils.TEST_RESULTS_LOG
TEST_UNAUTHORIZED_IP = config.TEST_UNAUTHORIZED_IP

@pytest.fixture(autouse=True)
def clear_test_logs():
    """Clear TEST_RUN_LOG before each test run. Leave TEST_RESULTS_LOG intact."""
    TEST_RUN_LOG.parent.mkdir(parents=True, exist_ok=True)
    TEST_RUN_LOG.write_text("")  # Clear only the run log
    yield

def record_test_result(prefix: str, name: str, result: str):
    """Ensure logger is ready, then append test result to TEST_RESULTS_LOG."""
    utils.setup_all_logs()  # Safe to call multiple times
    line = f"{prefix}{name} {result}"
    utils.log_test_result(line)
    time.sleep(1.0)

def timestamp():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
