from typing import Any

from firebase_admin import db

from services.firebase_app import get_app


def fetch_checkin_logs() -> dict[str, Any]:
    """Returns the raw `checkinLogs/{routeId}/{logId}` tree from Firebase.

    This is written by the driver's frontend on every check-in
    (frontend/src/services/shuttleService.ts) and kept as permanent history
    even after the live `shuttles/{routeId}/{driverId}` status is cleared on
    sign-out. Empty dict if no check-ins have been logged yet.
    """
    get_app()
    snapshot = db.reference("checkinLogs").get()
    return snapshot or {}
