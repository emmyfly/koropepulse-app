import json
from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd

MODEL_FILE = Path(__file__).resolve().parent.parent / "data" / "model.joblib"
METADATA_FILE = Path(__file__).resolve().parent.parent / "data" / "model_metadata.json"


class ModelNotTrainedError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _load_model():
    if not MODEL_FILE.exists():
        raise ModelNotTrainedError(
            "No trained model found. Run `python data/train_model.py` first."
        )
    return joblib.load(MODEL_FILE)


@lru_cache(maxsize=1)
def _load_metadata() -> dict:
    if not METADATA_FILE.exists():
        return {"trained_on": "synthetic"}
    return json.loads(METADATA_FILE.read_text())


def predict_eta(stop: str, day_of_week: int, hour: int, weather_flag: bool) -> tuple[float, str]:
    model = _load_model()
    metadata = _load_metadata()

    row = pd.DataFrame(
        [{"stop": stop, "day_of_week": day_of_week, "hour": hour, "weather_flag": int(weather_flag)}]
    )
    minutes = float(model.predict(row)[0])
    minutes = max(0.0, round(minutes, 1))

    confidence = "real_data_informed" if metadata.get("trained_on") == "real_field_data" else "synthetic"
    return minutes, confidence
