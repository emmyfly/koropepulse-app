from firebase_admin import auth

from services.firebase_app import get_app


def mint_driver_token(driver_id: str) -> str:
    """Mints a Firebase custom auth token scoped to this driver's UID.

    The frontend exchanges this for a signed-in session via
    signInWithCustomToken instead of signInAnonymously, so Firebase RTDB
    rules can eventually enforce `auth.uid === $driverId` on writes to
    `shuttles`/`checkinLogs` — closing the gap where a tampered client could
    write status under someone else's driverId. Raises RuntimeError (via
    get_app()) if Firebase Admin credentials aren't configured; callers
    should treat that as best-effort and degrade to no token rather than
    fail driver verification over it.
    """
    get_app()
    token_bytes = auth.create_custom_token(driver_id)
    return token_bytes.decode("utf-8")


class InvalidPhoneToken(Exception):
    pass


def verify_phone_id_token(id_token: str) -> str:
    """Verifies a Firebase ID token from a client that just completed a
    Firebase Phone Auth (SMS OTP) sign-in, and returns the verified E.164
    phone number.

    A token that verifies here is cryptographic proof the bearer received
    and entered the SMS code for that phone number — nobody can forge one
    without actually completing Firebase's OTP challenge. `check_revoked` is
    passed so a disabled/unlinked credential can't be replayed until the
    token's natural ~1hr expiry; this only runs on a new-device sign-in
    (not every check-in), so the extra Firebase round-trip is worth it.

    Raises InvalidPhoneToken if the token is invalid/expired, or wasn't
    actually from a phone sign-in. Raises RuntimeError (via get_app(), left
    uncaught here) if Firebase Admin isn't configured — unlike
    mint_driver_token's best-effort pattern, this whole endpoint is
    meaningless without it, so callers should treat that as a hard failure.
    """
    get_app()
    try:
        decoded = auth.verify_id_token(id_token, check_revoked=True)
    except Exception as exc:
        raise InvalidPhoneToken("Invalid or expired Firebase ID token.") from exc

    if decoded.get("firebase", {}).get("sign_in_provider") != "phone":
        raise InvalidPhoneToken("Token was not from a verified phone sign-in.")

    phone_number = decoded.get("phone_number")
    if not phone_number:
        raise InvalidPhoneToken("Token was not from a verified phone sign-in.")

    return phone_number
