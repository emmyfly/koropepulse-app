from fastapi.testclient import TestClient

from main import app
from routers import drivers as drivers_router
from services.firebase_auth import InvalidPhoneToken

client = TestClient(app)


def test_verify_phone_returns_503_when_firebase_not_configured():
    # No monkeypatching here on purpose: the test environment genuinely has
    # no FIREBASE_DATABASE_URL/credentials set, so this exercises the real
    # "Firebase Admin isn't configured" code path.
    response = client.post("/drivers/verify-phone", json={"id_token": "whatever"})
    assert response.status_code == 503


def test_verify_phone_succeeds_for_registered_driver(monkeypatch):
    monkeypatch.setattr(
        drivers_router, "verify_phone_id_token", lambda id_token: "+2348031234567"
    )

    response = client.post("/drivers/verify-phone", json={"id_token": "fake-valid-token"})

    assert response.status_code == 200
    body = response.json()
    assert body["driver_id"] == "driver-001"
    assert body["name"] == "Tunde Balogun"
    # mint_driver_token still hits the real (unconfigured) Firebase Admin app
    # in this test env, so this doesn't exercise the true "Firebase
    # configured" prod path -- it just documents current best-effort behavior.
    assert body["custom_token"] is None


def test_verify_phone_rejects_unregistered_phone_number(monkeypatch):
    monkeypatch.setattr(
        drivers_router, "verify_phone_id_token", lambda id_token: "+2348000000000"
    )

    response = client.post("/drivers/verify-phone", json={"id_token": "fake-valid-token"})

    assert response.status_code == 401


def test_verify_phone_rejects_invalid_token(monkeypatch):
    def raise_invalid(id_token: str) -> str:
        raise InvalidPhoneToken("Invalid or expired Firebase ID token.")

    monkeypatch.setattr(drivers_router, "verify_phone_id_token", raise_invalid)

    response = client.post("/drivers/verify-phone", json={"id_token": "garbage"})

    assert response.status_code == 401


def test_verify_phone_rejects_non_nigerian_number(monkeypatch):
    monkeypatch.setattr(
        drivers_router, "verify_phone_id_token", lambda id_token: "+14155552671"
    )

    response = client.post("/drivers/verify-phone", json={"id_token": "fake-valid-token"})

    assert response.status_code == 401


def test_verify_phone_rate_limits_per_ip(monkeypatch):
    monkeypatch.setattr(
        drivers_router, "verify_phone_id_token", lambda id_token: "+2348000000000"
    )

    for _ in range(10):
        response = client.post("/drivers/verify-phone", json={"id_token": "x"})
        assert response.status_code == 401

    response = client.post("/drivers/verify-phone", json={"id_token": "x"})
    assert response.status_code == 429
    assert "Retry-After" in response.headers
