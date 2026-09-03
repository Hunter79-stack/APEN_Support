import backend.utils as utils
from tests.conftest import record_test_result, timestamp

def test_bytes_to_mbps():
    name = "test_bytes_to_mbps"
    try:
        mbps = utils.bytes_to_mbps(1_000_000, 1.0)
        assert round(mbps, 2) == 8.0
        record_test_result(f"Test of ", name, "in tests/test_utils.py passed.")
    except Exception as e:
        record_test_result(f"Test of ", name, f"in tests/test_utils.py FAIL ({e})")
        raise
