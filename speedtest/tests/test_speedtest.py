import backend.speedtest as speedtest
from tests.conftest import record_test_result, timestamp

def test_measure_latency():
    name = "test_measure_latency"
    try:
        result = speedtest.measure_latency(count=3)
        assert all(k in result for k in ["min", "avg", "max", "jit"])
        record_test_result(f"Test of ", name, "in tests/test_speedtest.py passed.")
    except Exception as e:
        record_test_result(f"Test of ", name, f"in tests/test_speedtest.py FAIL ({e})")
        raise
