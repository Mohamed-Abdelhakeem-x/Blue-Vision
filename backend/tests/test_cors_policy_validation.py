import pytest
from pydantic import ValidationError

from app.core.config import Settings

_VALID_PROD_KWARGS = dict(
    app_env="production",
    secret_key="this-is-a-production-secret-key-with-32-chars",
    role_elevation_code="this-is-a-valid-role-elevation-code",
)


def test_production_rejects_wildcard_cors_origin() -> None:
    with pytest.raises(ValidationError, match="wildcard"):
        Settings(**_VALID_PROD_KWARGS, cors_origins="*")


def test_production_rejects_localhost_cors_origin() -> None:
    with pytest.raises(ValidationError, match="localhost"):
        Settings(**_VALID_PROD_KWARGS, cors_origins="http://localhost:3000")


def test_production_rejects_127_cors_origin() -> None:
    with pytest.raises(ValidationError, match="localhost"):
        Settings(**_VALID_PROD_KWARGS, cors_origins="http://127.0.0.1:8000")


def test_production_rejects_mixed_cors_origins_with_localhost() -> None:
    with pytest.raises(ValidationError, match="localhost"):
        Settings(
            **_VALID_PROD_KWARGS,
            cors_origins="https://bluevision.example.com,http://localhost:3000",
        )


def test_production_accepts_https_domain_cors_origins() -> None:
    settings = Settings(
        **_VALID_PROD_KWARGS,
        cors_origins="https://bluevision.example.com,https://api.bluevision.example.com",
    )
    assert "https://bluevision.example.com" in settings.cors_origin_list


def test_production_accepts_native_app_origin_regex() -> None:
    settings = Settings(
        **_VALID_PROD_KWARGS,
        cors_origins="https://bluevision.example.com,https://api.bluevision.example.com",
        cors_origin_regex=r"^(tauri://localhost|https://localhost|capacitor://localhost)$",
    )
    assert settings.cors_origin_regex == r"^(tauri://localhost|https://localhost|capacitor://localhost)$"


def test_development_allows_localhost_cors_origins() -> None:
    settings = Settings(
        app_env="development",
        cors_origins="http://localhost:3000,http://127.0.0.1:3000",
    )
    assert "http://localhost:3000" in settings.cors_origin_list
