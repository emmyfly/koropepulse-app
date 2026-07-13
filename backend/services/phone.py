from typing import Optional

NG_COUNTRY_CODE = "+234"
NG_LOCAL_DIGITS = 10


def e164_to_local(phone: str) -> Optional[str]:
    """Converts a Nigerian E.164 phone number (+234XXXXXXXXXX) to the local
    0XXXXXXXXXX format used in drivers.json. Returns None if it doesn't match
    that shape (wrong country code, wrong length, non-digit, or a redundant
    leading zero after the country code, e.g. +2340803...).
    """
    phone = phone.strip()
    if not phone.startswith(NG_COUNTRY_CODE):
        return None

    rest = phone[len(NG_COUNTRY_CODE):]
    if len(rest) != NG_LOCAL_DIGITS or not rest.isdigit():
        return None

    return "0" + rest
