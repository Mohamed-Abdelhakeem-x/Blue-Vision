from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app.core.config import get_settings


@pytest.mark.asyncio
async def test_refresh_rejects_wrong_audience_token(client):
    settings = get_settings()

    signup_payload = {
        "email": "wrong-aud@example.com",
        "full_name": "Wrong Audience",
        "password": "supersecure123",
    }
    signup_response = await client.post("/api/auth/signup", json=signup_payload)
    assert signup_response.status_code == 200
    user_id = signup_response.json()["id"]

    now = datetime.now(timezone.utc)
    forged_refresh = jwt.encode(
        {
            "sub": user_id,
            "jti": "00000000-0000-0000-0000-000000000001",
            "type": "refresh",
            "iss": settings.jwt_issuer,
            "aud": "wrong-audience",
            "iat": now,
            "nbf": now,
            "exp": now + timedelta(days=1),
        },
        settings.secret_key,
        algorithm=settings.algorithm,
    )

    response = await client.post("/api/auth/refresh", json={"refresh_token": forged_refresh})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid refresh token"
