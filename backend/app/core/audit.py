import json
import logging
from datetime import datetime, timezone

from fastapi import Request

from app.core.request_context import request_id as _request_id_ctx

LOGGER = logging.getLogger("app.audit")


def _client_identity(request: Request | None) -> str | None:
    if request is None:
        return None

    forwarded_for = request.headers.get("x-forwarded-for", "").strip()
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    return request.client.host if request.client else None


def audit_event(
    *,
    event: str,
    outcome: str,
    request: Request | None = None,
    user_id: str | None = None,
    email: str | None = None,
    reason: str | None = None,
    **extra_fields: object,
) -> None:
    payload = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "outcome": outcome,
    }

    rid = _request_id_ctx.get("")
    if rid:
        payload["request_id"] = rid

    client_ip = _client_identity(request)
    if client_ip:
        payload["client_ip"] = client_ip

    if user_id:
        payload["user_id"] = user_id

    if email:
        payload["email"] = email.strip().lower()

    if reason:
        payload["reason"] = reason

    for key, value in extra_fields.items():
        if value is not None:
            payload[key] = value

    LOGGER.info(json.dumps(payload, sort_keys=True))
