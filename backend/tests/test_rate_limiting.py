import pytest

from app.api.routes import auth, detection


@pytest.mark.asyncio
async def test_signup_rate_limit_enforced(client, monkeypatch):
    monkeypatch.setattr(auth.settings, "rate_limit_signup_per_minute", 2)

    for idx in range(2):
        response = await client.post(
            "/api/auth/signup",
            json={
                "email": f"limited-{idx}@example.com",
                "full_name": "Rate Limited",
                "password": "supersecure123",
            },
        )
        assert response.status_code == 200

    blocked = await client.post(
        "/api/auth/signup",
        json={
            "email": "limited-3@example.com",
            "full_name": "Rate Limited",
            "password": "supersecure123",
        },
    )

    assert blocked.status_code == 429
    assert blocked.headers.get("Retry-After") is not None


@pytest.mark.asyncio
async def test_detect_rate_limit_enforced(client, monkeypatch):
    monkeypatch.setattr(detection.settings, "rate_limit_detect_per_minute", 1)

    signup_payload = {
        "email": "rate-detect@example.com",
        "full_name": "Detect User",
        "password": "supersecure123",
    }
    signup_response = await client.post("/api/auth/signup", json=signup_payload)
    assert signup_response.status_code == 200

    login_response = await client.post(
        "/api/auth/login",
        json={"email": signup_payload["email"], "password": signup_payload["password"]},
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]

    ok = await client.post(
        "/api/detect",
        headers={"Authorization": f"Bearer {access_token}"},
        data={"domain": "color"},
        files={"image": ("plant.png", b"\x89PNGmock", "image/png")},
    )
    assert ok.status_code == 200

    blocked = await client.post(
        "/api/detect",
        headers={"Authorization": f"Bearer {access_token}"},
        data={"domain": "color"},
        files={"image": ("plant.png", b"\x89PNGmock2", "image/png")},
    )
    assert blocked.status_code == 429
    assert blocked.headers.get("Retry-After") is not None
