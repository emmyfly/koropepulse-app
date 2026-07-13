import hashlib
import json
import threading
import time
from pathlib import Path
from typing import Optional, TypedDict

DRIVERS_FILE = Path(__file__).resolve().parent.parent / "data" / "drivers.json"

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_WINDOW_SECONDS = 15 * 60

_lock = threading.Lock()
_failed_attempts: dict[str, list[float]] = {}


class DriverRecord(TypedDict):
    driver_id: str
    name: str
    phone: str
    pin_hash: str


class PhoneLockedOut(Exception):
    """Raised when a phone number has too many recent failed PIN attempts.

    A 4-digit PIN is only 10,000 combinations, so a per-phone sliding-window
    lockout (not just per-request validation) is the actual defense here.
    """

    def __init__(self, retry_after_seconds: int):
        self.retry_after_seconds = retry_after_seconds
        super().__init__(f"Too many failed attempts. Try again in {retry_after_seconds}s.")


def hash_pin(phone: str, pin: str) -> str:
    """Salts the PIN with the driver's phone number.

    This is intentionally lightweight (stdlib sha256, no bcrypt dependency)
    since the threat model here is "don't store PINs in plaintext" for a
    4-digit code, not a hardened auth system — see README security notes.
    """
    return hashlib.sha256(f"{phone}:{pin}".encode()).hexdigest()


def load_drivers() -> list[DriverRecord]:
    with open(DRIVERS_FILE) as f:
        return json.load(f)


def verify_driver(phone: str, pin: str) -> Optional[DriverRecord]:
    now = time.time()
    window_start = now - LOCKOUT_WINDOW_SECONDS

    with _lock:
        attempts = [t for t in _failed_attempts.get(phone, []) if t > window_start]
        _failed_attempts[phone] = attempts
        if len(attempts) >= MAX_FAILED_ATTEMPTS:
            raise PhoneLockedOut(int(attempts[0] + LOCKOUT_WINDOW_SECONDS - now) or 1)

    candidate_hash = hash_pin(phone, pin)
    for driver in load_drivers():
        if driver["phone"] == phone and driver["pin_hash"] == candidate_hash:
            with _lock:
                _failed_attempts.pop(phone, None)
            return driver

    with _lock:
        _failed_attempts.setdefault(phone, []).append(now)
    return None


def find_driver_by_phone(phone: str) -> Optional[DriverRecord]:
    """Looks up a driver by phone number only, no PIN.

    Used by the phone-OTP verification path, where a Firebase ID token has
    already cryptographically proven phone ownership — the PIN-guessing
    threat model `verify_driver`'s lockout defends against doesn't apply
    here, so this deliberately has no rate limiting of its own.
    """
    phone = phone.strip()
    for driver in load_drivers():
        if driver["phone"].strip() == phone:
            return driver
    return None
