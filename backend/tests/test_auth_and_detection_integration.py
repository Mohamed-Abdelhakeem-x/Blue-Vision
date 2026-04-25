import pytest

from app.services import upload_validation


@pytest.mark.asyncio
async def test_refresh_token_reuse_forces_session_invalidation(client):
    signup_payload = {
        "email": "farmer@example.com",
        "full_name": "Farm User",
        "password": "supersecure123",
    }
    signup_response = await client.post("/api/auth/signup", json=signup_payload)
    assert signup_response.status_code == 200

    login_response = await client.post(
        "/api/auth/login",
        json={"email": signup_payload["email"], "password": signup_payload["password"]},
    )
    assert login_response.status_code == 200
    tokens_1 = login_response.json()

    refresh_response = await client.post("/api/auth/refresh", json={"refresh_token": tokens_1["refresh_token"]})
    assert refresh_response.status_code == 200
    tokens_2 = refresh_response.json()

    reused_response = await client.post("/api/auth/refresh", json={"refresh_token": tokens_1["refresh_token"]})
    assert reused_response.status_code == 401
    assert reused_response.json()["detail"] == "Refresh token reuse detected"

    invalidated_response = await client.post("/api/auth/refresh", json={"refresh_token": tokens_2["refresh_token"]})
    assert invalidated_response.status_code == 401


@pytest.mark.asyncio
async def test_logout_revokes_current_refresh_token(client):
    signup_payload = {
        "email": "logout@example.com",
        "full_name": "Logout User",
        "password": "supersecure123",
    }
    await client.post("/api/auth/signup", json=signup_payload)

    login_response = await client.post(
        "/api/auth/login",
        json={"email": signup_payload["email"], "password": signup_payload["password"]},
    )
    tokens = login_response.json()

    logout_response = await client.post("/api/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert logout_response.status_code == 200

    refresh_response = await client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert refresh_response.status_code == 401


@pytest.mark.asyncio
async def test_detect_rejects_invalid_mime_type(client):
    signup_payload = {
        "email": "detect-mime@example.com",
        "full_name": "Detect User",
        "password": "supersecure123",
    }
    await client.post("/api/auth/signup", json=signup_payload)
    login_response = await client.post(
        "/api/auth/login",
        json={"email": signup_payload["email"], "password": signup_payload["password"]},
    )
    access_token = login_response.json()["access_token"]

    response = await client.post(
        "/api/detect",
        headers={"Authorization": f"Bearer {access_token}"},
        data={"domain": "color"},
        files={"image": ("leaf.txt", b"this-is-not-an-image", "text/plain")},
    )

    assert response.status_code == 415


@pytest.mark.asyncio
async def test_detect_rejects_oversized_image(client, monkeypatch):
    monkeypatch.setattr(upload_validation.settings, "upload_max_bytes", 128)

    signup_payload = {
        "email": "detect-size@example.com",
        "full_name": "Detect Size User",
        "password": "supersecure123",
    }
    await client.post("/api/auth/signup", json=signup_payload)
    login_response = await client.post(
        "/api/auth/login",
        json={"email": signup_payload["email"], "password": signup_payload["password"]},
    )
    access_token = login_response.json()["access_token"]

    oversized_bytes = b"\x89PNG" + (b"a" * 1024)
    response = await client.post(
        "/api/detect",
        headers={"Authorization": f"Bearer {access_token}"},
        data={"domain": "color"},
        files={"image": ("leaf.png", oversized_bytes, "image/png")},
    )

    assert response.status_code == 413
