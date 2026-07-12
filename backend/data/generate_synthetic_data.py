"""Generates a synthetic dataset shaped like real BRT terminal observations.

Columns: stop, day_of_week, hour, weather_flag, headway_minutes, queue_count.
day_of_week is 0=Monday .. 6=Sunday. These are raw "what you'd log standing
at a terminal" observations — headway and queue length — not the wait time
itself. train_model.py derives the wait-time training target from them.

Run: python generate_synthetic_data.py
"""

import csv
import random
from pathlib import Path

import sys

sys.path.append(str(Path(__file__).resolve().parent.parent))
from services.stops import STOPS  # noqa: E402

OUTPUT_FILE = Path(__file__).resolve().parent / "synthetic_shuttle_data.csv"

PEAK_HOURS = {7, 8, 9, 16, 17, 18}
HOURS_PER_STOP_PER_DAY = 5

# Relative demand multiplier per stop. CITS is the single on-campus hub
# serving both routes, so it sees the most combined traffic; Bariga and
# Yaba are each fed by only one route.
STOP_DEMAND_FACTOR = {
    "CITS": 1.3,
    "Bariga": 1.0,
    "Yaba": 1.05,
}


def sample_hour(rng: random.Random) -> int:
    weights = [3 if h in PEAK_HOURS else 1 for h in range(24)]
    return rng.choices(range(24), weights=weights, k=1)[0]


def generate_row(stop: str, day_of_week: int, rng: random.Random) -> dict:
    hour = sample_hour(rng)
    is_weekend = day_of_week in (5, 6)
    is_peak = hour in PEAK_HOURS and not is_weekend
    weather_flag = rng.random() < 0.25
    demand_factor = STOP_DEMAND_FACTOR.get(stop, 1.0)

    if is_peak:
        headway = rng.uniform(5, 10)
        queue = rng.uniform(15, 30)
    elif is_weekend:
        headway = rng.uniform(20, 35)
        queue = rng.uniform(3, 10)
    else:
        headway = rng.uniform(12, 22)
        queue = rng.uniform(6, 16)

    if weather_flag:
        headway *= rng.uniform(1.05, 1.2)  # rain slows buses down
        queue += rng.uniform(5, 12)  # longer queues in rain

    queue *= demand_factor

    return {
        "stop": stop,
        "day_of_week": day_of_week,
        "hour": hour,
        "weather_flag": int(weather_flag),
        "headway_minutes": round(headway, 1),
        "queue_count": max(0, round(queue)),
    }


def main() -> None:
    rng = random.Random(42)
    rows = [
        generate_row(stop, day_of_week, rng)
        for stop in STOPS
        for day_of_week in range(7)
        for _ in range(HOURS_PER_STOP_PER_DAY)
    ]

    with open(OUTPUT_FILE, "w", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["stop", "day_of_week", "hour", "weather_flag", "headway_minutes", "queue_count"],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
