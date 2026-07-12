from fastapi import APIRouter, HTTPException

from models.schemas import DriverVerifyRequest, DriverVerifyResponse
from services.driver_store import verify_driver

router = APIRouter(prefix="/drivers", tags=["drivers"])


@router.post("/verify", response_model=DriverVerifyResponse)
def verify(request: DriverVerifyRequest) -> DriverVerifyResponse:
    driver = verify_driver(request.phone, request.pin)
    if driver is None:
        raise HTTPException(status_code=401, detail="Phone number or PIN is incorrect.")

    return DriverVerifyResponse(
        driver_id=driver["driver_id"],
        name=driver["name"],
    )
