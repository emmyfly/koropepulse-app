from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_verify_driver_with_correct_pin():
    response = client.post("/drivers/verify", json={"phone": "08031234567", "pin": "1234"})
    assert response.status_code == 200
    body = response.json()
    assert body["driver_id"] == "driver-001"
    assert body["name"] == "Tunde Balogun"


def test_verify_driver_with_wrong_pin():
    response = client.post("/drivers/verify", json={"phone": "08031234567", "pin": "0000"})
    assert response.status_code == 401


def test_verify_driver_with_unknown_phone():
    response = client.post("/drivers/verify", json={"phone": "08000000000", "pin": "1234"})
    assert response.status_code == 401


def test_verify_driver_rejects_non_numeric_pin():
    response = client.post("/drivers/verify", json={"phone": "08031234567", "pin": "abcd"})
    assert response.status_code == 422


def test_verify_driver_rejects_short_pin():
    response = client.post("/drivers/verify", json={"phone": "08031234567", "pin": "12"})
    assert response.status_code == 422


def test_verify_driver_returns_null_custom_token_when_firebase_not_configured():
    response = client.post("/drivers/verify", json={"phone": "08031234567", "pin": "1234"})
    assert response.status_code == 200
    assert response.json()["custom_token"] is None


def test_verify_driver_locks_out_after_too_many_failed_attempts():
    for _ in range(5):
        response = client.post("/drivers/verify", json={"phone": "08031234567", "pin": "0000"})
        assert response.status_code == 401

    response = client.post("/drivers/verify", json={"phone": "08031234567", "pin": "1234"})
    assert response.status_code == 429
    assert "Retry-After" in response.headers


def test_verify_driver_lockout_is_scoped_to_phone_number():
    for _ in range(5):
        client.post("/drivers/verify", json={"phone": "08031234567", "pin": "0000"})

    response = client.post("/drivers/verify", json={"phone": "08059876543", "pin": "0000"})
    assert response.status_code == 401


def test_verify_driver_success_resets_failed_attempt_count():
    for _ in range(4):
        response = client.post("/drivers/verify", json={"phone": "08031234567", "pin": "0000"})
        assert response.status_code == 401

    success = client.post("/drivers/verify", json={"phone": "08031234567", "pin": "1234"})
    assert success.status_code == 200

    for _ in range(4):
        response = client.post("/drivers/verify", json={"phone": "08031234567", "pin": "0000"})
        assert response.status_code == 401
