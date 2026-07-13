from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

Confidence = Literal["synthetic", "real_data_informed"]


class EtaRequest(BaseModel):
    stop: str = Field(..., min_length=1, description="Stop name, e.g. 'CITS', 'Bariga', 'Yaba'")
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday .. 6=Sunday")
    hour: int = Field(..., ge=0, le=23)
    weather_flag: bool = Field(..., description="True if raining")

    @field_validator("stop")
    @classmethod
    def strip_stop(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("stop must not be blank")
        return value


class EtaResponse(BaseModel):
    stop: str
    estimated_wait_minutes: float
    confidence: Confidence


class DriverVerifyRequest(BaseModel):
    phone: str = Field(..., min_length=7, max_length=15)
    pin: str = Field(..., min_length=4, max_length=4)

    @field_validator("pin")
    @classmethod
    def pin_is_numeric(cls, value: str) -> str:
        if not value.isdigit():
            raise ValueError("pin must be exactly 4 digits")
        return value

    @field_validator("phone")
    @classmethod
    def phone_is_digits(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned.lstrip("+").isdigit():
            raise ValueError("phone must contain only digits (with optional leading +)")
        return cleaned


class DriverPhoneVerifyRequest(BaseModel):
    id_token: str = Field(
        ...,
        min_length=1,
        description="Firebase ID token from a completed Phone Auth (SMS OTP) sign-in.",
    )


class DriverVerifyResponse(BaseModel):
    driver_id: str
    name: str
    custom_token: Optional[str] = Field(
        default=None,
        description=(
            "Firebase custom auth token scoped to this driver's UID, for "
            "signInWithCustomToken. Null if Firebase Admin isn't configured "
            "on the backend — frontend should fall back to signInAnonymously."
        ),
    )


class HealthResponse(BaseModel):
    status: Literal["ok"]
