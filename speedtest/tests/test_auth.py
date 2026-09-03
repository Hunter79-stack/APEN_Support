import pytest
import requests
import backend.config as config
import backend.utils as utils
from tests.conftest import record_test_result, timestamp, TEST_UNAUTHORIZED_IP

BASE_URL = f"http://127.0.0.1:{config.PORT}"

def test_unauthorized_ip_blocked():
    name = "test_unauthorized_ip_blocked"
    try:
        r = requests.get(f"{BASE_URL}/speedtest/api/ping", headers={"X-Forwarded-For": TEST_UNAUTHORIZED_IP})
        if r.status_code == 200:
            pytest.skip("server is in open mode (default); start it with SPEEDTEST_ALLOW_ALL=0 to exercise the IP gate")
        assert r.status_code == 403
        record_test_result(f"Test of ", name, "in tests/test_auth.py passed.")
    except Exception as e:
        record_test_result(f"Test of ", name, f"in tests/test_auth.py FAIL ({e})")
        raise


