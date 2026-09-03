import requests
import backend.config as config
from tests.conftest import record_test_result

BASE_URL = f"http://127.0.0.1:{config.PORT}"
HEADERS = {"X-Forwarded-For": "127.0.0.1"}

def test_verify_upload():
    name = "test_verify_upload"
    try:
        chunks = 1
        size = 1024
        payload = b"x" * (chunks * size)
        r = requests.post(f"{BASE_URL}/speedtest/api/upload", data=payload, headers=HEADERS)
        assert r.status_code == 200
        assert r.json()["received"] == chunks * size
        record_test_result("Test of ", name, "in tests/test_verify_upload.py passed.")
    except Exception as e:
        record_test_result("Test of ", name, f"in tests/test_verify_upload.py FAIL ({e})")
        raise
