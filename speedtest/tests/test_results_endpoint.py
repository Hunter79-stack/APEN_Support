import requests
import backend.config as config
from tests.conftest import record_test_result

BASE_URL = f"http://127.0.0.1:{config.PORT}"
HEADERS = {"X-Forwarded-For": "127.0.0.1"}

def test_results_endpoint():
    name = "test_results_endpoint"
    try:
        payload = {
            "latency": {"min": 5.0, "avg": 10.0, "max": 20.0, "jit": 3.0},
            "download": 123.45,
            "upload": 67.89,
            "ts": 1750000000000
        }
        r = requests.post(f"{BASE_URL}/speedtest/api/results", json=payload, headers=HEADERS)
        assert r.status_code == 200
        assert r.json()["ok"] is True
        record_test_result("Test of ", name, "in tests/test_results_endpoint.py passed.")
    except Exception as e:
        record_test_result("Test of ", name, f"in tests/test_results_endpoint.py FAIL ({e})")
        raise
