from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_predict_eta_returns_valid_response():
    response = client.post(
        "/predict/eta",
        json={"stop": "CITS", "day_of_week": 1, "hour": 8, "weather_flag": False},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["stop"] == "CITS"
    assert body["estimated_wait_minutes"] >= 0
    assert body["confidence"] == "synthetic"


def test_predict_eta_rush_hour_is_shorter_than_late_night_weekend():
    rush = client.post(
        "/predict/eta",
        json={"stop": "CITS", "day_of_week": 1, "hour": 8, "weather_flag": False},
    ).json()
    off_peak = client.post(
        "/predict/eta",
        json={"stop": "CITS", "day_of_week": 6, "hour": 23, "weather_flag": False},
    ).json()
    assert rush["estimated_wait_minutes"] < off_peak["estimated_wait_minutes"]


def test_predict_eta_rejects_invalid_hour():
    response = client.post(
        "/predict/eta",
        json={"stop": "CITS", "day_of_week": 1, "hour": 25, "weather_flag": False},
    )
    assert response.status_code == 422


def test_predict_eta_rejects_invalid_day_of_week():
    response = client.post(
        "/predict/eta",
        json={"stop": "CITS", "day_of_week": 9, "hour": 8, "weather_flag": False},
    )
    assert response.status_code == 422


def test_predict_eta_rejects_missing_field():
    response = client.post("/predict/eta", json={"stop": "CITS", "hour": 8})
    assert response.status_code == 422


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
