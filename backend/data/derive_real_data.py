"""Derives real training rows from driver check-in events logged live in
Firebase (frontend/src/services/shuttleService.ts writes each check-in to
`checkinLogs/{routeId}/{logId}`, kept as permanent history even after the
live status is cleared on sign-out).

Only "arrived" events carry a wait-time signal: headway_minutes is the gap
between consecutive arrivals at the same stop. weather_flag and queue_count
aren't captured by the current check-in UI at all, so both are written as
0 for every derived row — the model will only ever learn a headway-driven
wait time from real data until that's addressed. Known accuracy ceiling,
not a bug; see README roadmap.

Requires FIREBASE_DATABASE_URL and either FIREBASE_SERVICE_ACCOUNT_JSON or
GOOGLE_APPLICATION_CREDENTIALS to be set — see .env.example.

Run: python derive_real_data.py [output_file]
Then: python retrain.py [output_file]
"""

import csv
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

sys.path.append(str(Path(__file__).resolve().parent.parent))
from services.firebase_checkins import fetch_checkin_logs  # noqa: E402

OUTPUT_FILE = Path(__file__).resolve().parent / "derived_real_data.csv"
WAT = timezone(timedelta(hours=1))  # Nigeria has no DST
MAX_HEADWAY_MINUTES = 90  # longer gaps are overnight/service breaks, not a real headway
FIELDNAMES = ["stop", "day_of_week", "hour", "weather_flag", "headway_minutes", "queue_count"]


def _arrival_timestamps_by_stop(raw_logs: dict) -> dict[str, list[int]]:
    by_stop: dict[str, list[int]] = {}
    for route_logs in raw_logs.values():
        if not route_logs:
            continue
        for entry in route_logs.values():
            if entry.get("state") != "arrived":
                continue
            stop = entry.get("currentStop")
            logged_at = entry.get("loggedAt")
            if not stop or logged_at is None:
                continue
            by_stop.setdefault(stop, []).append(logged_at)
    return by_stop


def derive_rows(raw_logs: dict) -> list[dict[str, Any]]:
    rows = []
    for stop, timestamps in _arrival_timestamps_by_stop(raw_logs).items():
        timestamps.sort()
        for prev_ms, curr_ms in zip(timestamps, timestamps[1:]):
            headway_minutes = (curr_ms - prev_ms) / 60_000
            if headway_minutes <= 0 or headway_minutes > MAX_HEADWAY_MINUTES:
                continue
            arrival_time = datetime.fromtimestamp(curr_ms / 1000, tz=WAT)
            rows.append(
                {
                    "stop": stop,
                    "day_of_week": arrival_time.weekday(),
                    "hour": arrival_time.hour,
                    "weather_flag": 0,
                    "headway_minutes": round(headway_minutes, 1),
                    "queue_count": 0,
                }
            )
    return rows


def main() -> None:
    output_file = Path(sys.argv[1]) if len(sys.argv) > 1 else OUTPUT_FILE
    rows = derive_rows(fetch_checkin_logs())

    if not rows:
        print(
            "No usable arrival pairs found yet — need at least two 'arrived' "
            "check-ins at the same stop to compute a headway. Nothing written."
        )
        return

    with open(output_file, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows derived from real check-ins to {output_file}")
    print(f"Next: python retrain.py {output_file}")


if __name__ == "__main__":
    main()
