import pytest

from routers import drivers as drivers_router
from services import driver_store


@pytest.fixture(autouse=True)
def reset_login_attempts():
    driver_store._failed_attempts.clear()
    drivers_router._phone_verify_limiter._attempts.clear()
    yield
    driver_store._failed_attempts.clear()
    drivers_router._phone_verify_limiter._attempts.clear()
