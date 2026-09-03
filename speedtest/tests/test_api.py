import requests
import backend.config as config
import backend.utils as utils
from tests.conftest import record_test_result, timestamp

BASE_URL = f"http://127.0.0.1:{config.PORT}"
HEADERS = {"X-Forwarded-For": "127.0.0.1"}

def test_config_endpoint():
    name = "test_config_endpoint"
    try:
        r = requests.get(f"{BASE_URL}/speedtest/api/config", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert "PING_COUNT" in data
        assert "CHUNK_SIZE" in data
        assert "PHASE_TIME_MS" in data
        assert "ENDPOINTS" in data
        record_test_result(f"Test of ", name, "in tests/test_api.py passed.")
    except Exception as e:
        record_test_result(f"Test of ", name, f"in tests/test_api.py FAIL ({e})")
        raise

def test_ping_endpoint():
    name = "test_ping_endpoint"
    try:
        r = requests.get(f"{BASE_URL}/speedtest/api/ping", headers=HEADERS)
        assert r.status_code == 200
        assert "ts" in r.json()
        record_test_result(f"Test of ", name, "in tests/test_api.py passed.")
    except Exception as e:
        record_test_result(f"Test of ", name, f"in tests/test_api.py FAIL ({e})")
        raise
