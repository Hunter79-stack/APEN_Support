import requests
import backend.config as config
from tests.conftest import record_test_result

BASE_URL = f"http://127.0.0.1:{config.PORT}"
HEADERS = {"X-Forwarded-For": "127.0.0.1"}

def test_verify_download():
    name = "test_verify_download"
    try:
        chunks = 1
        size = 1024
        r = requests.get(f"{BASE_URL}/speedtest/api/download?chunks={chunks}&size={size}", headers=HEADERS)
        assert r.status_code == 200
        assert len(r.content) == chunks * size
        record_test_result("Test of ", name, "in tests/test_verify_download.py passed.")
    except Exception as e:
        record_test_result("Test of ", name, f"in tests/test_verify_download.py FAIL ({e})")
        raise
