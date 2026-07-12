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
