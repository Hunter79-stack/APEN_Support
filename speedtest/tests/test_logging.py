import backend.utils as utils
from tests.conftest import TEST_RUN_LOG, TEST_RESULTS_LOG, record_test_result, timestamp

def test_log_test_run_and_results():
    name = "test_log_test_run_and_results"
    try:
        utils.setup_all_logs()  # Ensure loggers are fully initialized with handlers

        utils.log_test_run(f"{name} - PASS")

        with open(TEST_RUN_LOG) as f:
            assert f"{name} - PASS" in f.read()

        record_test_result(f"Test of ", name, "in tests/test_logging.py passed.")
    except Exception as e:
        record_test_result(f"Test of ", name, f"in tests/test_logging.py FAIL ({e})")
        raise
