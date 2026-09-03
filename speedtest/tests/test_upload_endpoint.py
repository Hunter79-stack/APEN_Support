import requests
import backend.config as config
from tests.conftest import record_test_result

BASE_URL = f"http://127.0.0.1:{config.PORT}"
HEADERS = {"X-Forwarded-For": "127.0.0.1"}

def test_upload_endpoint():
    name = "test_upload_endpoint"
    try:
        payload = b"x" * 2048
        r = requests.post(f"{BASE_URL}/speedtest/api/upload", data=payload, headers=HEADERS)
        assert r.status_code == 200
        assert r.json()["received"] == 2048
        record_test_result("Test of ", name, "in tests/test_upload_endpoint.py passed.")
    except Exception as e:
        record_test_result("Test of ", name, f"in tests/test_upload_endpoint.py FAIL ({e})")
        raise
