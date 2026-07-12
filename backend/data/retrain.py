"""Retrains the ETA model on real field data once it's been collected.

This is the concrete mechanism for the synthetic -> real data roadmap: once
BRT terminal observations have been logged in the same schema as
real_field_data_template.csv (stop, day_of_week, hour, weather_flag,
headway_minutes, queue_count), point this script at that file and it
replaces data/model.joblib in place. /predict/eta will then start
returning confidence="real_data_informed" automatically, since that flag is
read from model_metadata.json written here.

Run: python retrain.py path/to/real_observations.csv
"""

import sys
from pathlib import Path

from train_model import train

TEMPLATE_FILE = Path(__file__).resolve().parent / "real_field_data_template.csv"

if __name__ == "__main__":
    data_file = Path(sys.argv[1]) if len(sys.argv) > 1 else TEMPLATE_FILE

    if data_file == TEMPLATE_FILE:
        print(
            "No real data file given — pass a path, e.g.\n"
            "  python retrain.py path/to/real_observations.csv\n"
            "Falling back to the empty template will fail until real rows are added."
        )

    train(data_file, trained_on_label="real_field_data")
