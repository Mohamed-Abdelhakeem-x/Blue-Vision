import logging

import pytest
from app.api.routes import users


@pytest.mark.asyncio
async def test_login_failure_emits_audit_event(client, caplog):
    caplog.set_level(logging.INFO, logger="app.audit")

    response = await client.post(
        "/api/auth/login",
        json={"email": "missing@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401
    messages = [record.message for record in caplog.records if record.name == "app.audit"]
    assert any('"event": "auth.login"' in message for message in messages)
    assert any('"outcome": "denied"' in message for message in messages)


@pytest.mark.asyncio
async def test_signup_success_emits_audit_event(client, caplog):
    caplog.set_level(logging.INFO, logger="app.audit")

    payload = {
        "email": "audit-signup@example.com",
        "full_name": "Audit Signup",
        "password": "supersecure123",
    }
    response = await client.post("/api/auth/signup", json=payload)

    assert response.status_code == 200
    messages = [record.message for record in caplog.records if record.name == "app.audit"]
    assert any('"event": "auth.signup"' in message for message in messages)
    assert any('"outcome": "success"' in message for message in messages)


@pytest.mark.asyncio
async def test_admin_role_update_emits_audit_event(client, caplog, monkeypatch):
    caplog.set_level(logging.INFO, logger="app.audit")
    monkeypatch.setattr(users.settings, "role_elevation_code", "test-role-elevation-code")

    admin_email = "audit-admin@example.com"
    target_email = "audit-target@example.com"
    password = "supersecure123"

    await client.post(
        "/api/auth/signup",
        json={"email": admin_email, "full_name": "Audit Admin", "password": password},
    )
    await client.post(
        "/api/auth/signup",
        json={"email": target_email, "full_name": "Audit Target", "password": password},
    )

    login_response = await client.post("/api/auth/login", json={"email": admin_email, "password": password})
    assert login_response.status_code == 200
    admin_token = login_response.json()["access_token"]

    elevate_response = await client.post(
        "/api/users/self/role/by-code",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"code": "test-role-elevation-code", "role": "admin"},
    )
    assert elevate_response.status_code == 200

    relogin_response = await client.post("/api/auth/login", json={"email": admin_email, "password": password})
    assert relogin_response.status_code == 200
    admin_token = relogin_response.json()["access_token"]

    list_users_response = await client.get(
        "/api/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert list_users_response.status_code == 200
    target_user_id = next(user["id"] for user in list_users_response.json() if user["email"] == target_email)

    update_response = await client.patch(
        f"/api/users/{target_user_id}/role",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "developer"},
    )
    assert update_response.status_code == 200

    messages = [record.message for record in caplog.records if record.name == "app.audit"]
    assert any('"event": "users.role_update"' in message for message in messages)
    assert any('"outcome": "success"' in message for message in messages)
