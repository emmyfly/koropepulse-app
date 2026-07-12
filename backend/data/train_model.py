"""Trains the ETA baseline model on synthetic_shuttle_data.csv.

The API only knows [stop, day_of_week, hour, weather_flag] at request time
(a commuter doesn't know the current headway or queue length — that's what
we're predicting). So the training target, estimated_wait_minutes, is
derived from the logged headway_minutes and queue_count using a standard
random-arrival approximation: expected wait ~= headway/2, plus a per-person
boarding delay contributed by the queue already waiting.

Run: python train_model.py
"""

import json
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

sys.path.append(str(Path(__file__).resolve().parent.parent))

DATA_FILE = Path(__file__).resolve().parent / "synthetic_shuttle_data.csv"
MODEL_FILE = Path(__file__).resolve().parent / "model.joblib"
METADATA_FILE = Path(__file__).resolve().parent / "model_metadata.json"

FEATURE_COLUMNS = ["stop", "day_of_week", "hour", "weather_flag"]
BOARDING_SECONDS_PER_RIDER = 4


def derive_wait_minutes(df: pd.DataFrame) -> pd.Series:
    boarding_delay = (df["queue_count"] * BOARDING_SECONDS_PER_RIDER) / 60
    return (df["headway_minutes"] / 2) + boarding_delay


def build_pipeline() -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[("stop", OneHotEncoder(handle_unknown="ignore"), ["stop"])],
        remainder="passthrough",
    )
    return Pipeline(
        steps=[
            ("preprocess", preprocessor),
            ("model", GradientBoostingRegressor(random_state=42)),
        ]
    )


def train(data_file: Path, trained_on_label: str) -> None:
    df = pd.read_csv(data_file)
    df["target_wait_minutes"] = derive_wait_minutes(df)

    X = df[FEATURE_COLUMNS]
    y = df["target_wait_minutes"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    rmse = root_mean_squared_error(y_test, predictions)

    print(f"Trained on {len(df)} rows ({trained_on_label})")
    print(f"  MAE:  {mae:.2f} minutes")
    print(f"  RMSE: {rmse:.2f} minutes")

    joblib.dump(pipeline, MODEL_FILE)
    METADATA_FILE.write_text(
        json.dumps(
            {
                "trained_on": trained_on_label,
                "n_rows": len(df),
                "mae_minutes": round(mae, 3),
                "rmse_minutes": round(rmse, 3),
            },
            indent=2,
        )
    )
    print(f"Saved model to {MODEL_FILE}")
    print(f"Saved metadata to {METADATA_FILE}")


if __name__ == "__main__":
    train(DATA_FILE, trained_on_label="synthetic")
