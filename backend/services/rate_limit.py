import threading
import time


class RateLimitExceeded(Exception):
    def __init__(self, retry_after_seconds: int):
        self.retry_after_seconds = retry_after_seconds
        super().__init__(f"Rate limit exceeded. Try again in {retry_after_seconds}s.")


class SlidingWindowLimiter:
    """Thread-safe in-memory sliding-window rate limiter, keyed by an
    arbitrary string (phone number, client IP, etc).

    Not distributed — resets on process restart, fine for a single-instance
    deployment. Every call to `check()` counts toward the budget regardless
    of what the caller does with it afterwards (unlike driver_store's PIN
    lockout, which only counts failures and resets on success) — this is
    for capping raw request volume/cost against an endpoint, not counting
    wrong guesses.
    """

    def __init__(self, max_attempts: int, window_seconds: int):
        self._max_attempts = max_attempts
        self._window_seconds = window_seconds
        self._lock = threading.Lock()
        self._attempts: dict[str, list[float]] = {}

    def check(self, key: str) -> None:
        now = time.time()
        window_start = now - self._window_seconds
        with self._lock:
            attempts = [t for t in self._attempts.get(key, []) if t > window_start]
            if len(attempts) >= self._max_attempts:
                self._attempts[key] = attempts
                raise RateLimitExceeded(int(attempts[0] + self._window_seconds - now) or 1)
            attempts.append(now)
            self._attempts[key] = attempts
