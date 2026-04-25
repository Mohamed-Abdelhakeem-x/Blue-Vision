from collections import defaultdict, deque
from threading import Lock
from time import time
from typing import Deque

from fastapi import HTTPException, Request, status

_BUCKETS: dict[tuple[str, str], Deque[float]] = defaultdict(deque)
_LOCK = Lock()


def clear_rate_limit_state() -> None:
    with _LOCK:
        _BUCKETS.clear()


def _client_identity(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "").strip()
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    client_host = request.client.host if request.client else None
    return client_host or "unknown"


async def enforce_rate_limit(
    *,
    request: Request,
    scope: str,
    limit: int,
    window_seconds: int,
    identity: str | None = None,
) -> None:
    if limit <= 0:
        return

    now = time()
    key = (scope, identity or _client_identity(request))

    with _LOCK:
        bucket = _BUCKETS[key]
        window_start = now - window_seconds
        while bucket and bucket[0] <= window_start:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = max(1, int(bucket[0] + window_seconds - now))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {scope}",
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(now)