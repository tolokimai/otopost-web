import time
from collections import defaultdict
from typing import Dict, List
from fastapi import Request

from .errors import RateLimitedException

# In-memory sliding window bucket: ip -> list of timestamps
_client_timestamps: Dict[str, List[float]] = defaultdict(list)


def rate_limit(max_requests: int = 60, window_seconds: int = 60):
    """FastAPI dependency for sliding-window rate limiting per client IP."""

    def dependency(request: Request):
        client_ip = (
            request.headers.get("x-forwarded-for")
            or request.client.host
            if request.client
            else "127.0.0.1"
        )
        now = time.time()
        cutoff = now - window_seconds

        timestamps = _client_timestamps[client_ip]
        # Prune old timestamps
        _client_timestamps[client_ip] = [ts for ts in timestamps if ts > cutoff]

        if len(_client_timestamps[client_ip]) >= max_requests:
            raise RateLimitedException(
                f"Rate limit terlampaui. Maksimal {max_requests} permintaan per {window_seconds} detik."
            )

        _client_timestamps[client_ip].append(now)

    return dependency
