from fastapi import APIRouter, HTTPException, Request

from models.schemas import DriverPhoneVerifyRequest, DriverVerifyRequest, DriverVerifyResponse
from services.driver_store import PhoneLockedOut, find_driver_by_phone, verify_driver
from services.firebase_auth import InvalidPhoneToken, mint_driver_token, verify_phone_id_token
from services.phone import e164_to_local
from services.rate_limit import RateLimitExceeded, SlidingWindowLimiter

router = APIRouter(prefix="/drivers", tags=["drivers"])

_phone_verify_limiter = SlidingWindowLimiter(max_attempts=10, window_seconds=5 * 60)


@router.post("/verify", response_model=DriverVerifyResponse)
def verify(request: DriverVerifyRequest) -> DriverVerifyResponse:
    try:
        driver = verify_driver(request.phone, request.pin)
    except PhoneLockedOut as exc:
        raise HTTPException(
            status_code=429,
            detail=str(exc),
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc

    if driver is None:
        raise HTTPException(status_code=401, detail="Phone number or PIN is incorrect.")

    try:
        custom_token = mint_driver_token(driver["driver_id"])
    except RuntimeError:
        custom_token = None

    return DriverVerifyResponse(
        driver_id=driver["driver_id"],
        name=driver["name"],
        custom_token=custom_token,
    )


@router.post("/verify-phone", response_model=DriverVerifyResponse)
def verify_phone(request: DriverPhoneVerifyRequest, http_request: Request) -> DriverVerifyResponse:
    """Identity check for a driver who just completed Firebase Phone Auth
    (SMS OTP) on the frontend, as a stronger alternative to phone+PIN for
    new/unrecognized devices — closes the gap where knowing a driver's
    phone+PIN (but not having their actual phone) is enough to impersonate
    them via `/verify`.
    """
    client_ip = http_request.client.host if http_request.client else "unknown"
    try:
        _phone_verify_limiter.check(client_ip)
    except RateLimitExceeded as exc:
        raise HTTPException(
            status_code=429,
            detail=str(exc),
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc

    try:
        phone_e164 = verify_phone_id_token(request.id_token)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except InvalidPhoneToken as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    local_phone = e164_to_local(phone_e164)
    driver = find_driver_by_phone(local_phone) if local_phone else None
    if driver is None:
        raise HTTPException(status_code=401, detail="Phone number is not a registered driver.")

    try:
        custom_token = mint_driver_token(driver["driver_id"])
    except RuntimeError:
        custom_token = None

    return DriverVerifyResponse(
        driver_id=driver["driver_id"],
        name=driver["name"],
        custom_token=custom_token,
    )
