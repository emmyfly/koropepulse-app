import hashlib
import json
from pathlib import Path
from typing import Optional, TypedDict

DRIVERS_FILE = Path(__file__).resolve().parent.parent / "data" / "drivers.json"


class DriverRecord(TypedDict):
    driver_id: str
    name: str
    phone: str
    pin_hash: str


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
    candidate_hash = hash_pin(phone, pin)
    for driver in load_drivers():
        if driver["phone"] == phone and driver["pin_hash"] == candidate_hash:
            return driver
    return None
