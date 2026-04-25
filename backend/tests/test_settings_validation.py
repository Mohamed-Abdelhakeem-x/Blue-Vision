import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_production_rejects_default_secret_key() -> None:
    with pytest.raises(ValidationError):
        Settings(
            app_env="production",
            secret_key="change-me-in-production",
            role_elevation_code="this-is-a-valid-role-elevation-code",
        )


def test_production_requires_role_elevation_code() -> None:
    with pytest.raises(ValidationError):
        Settings(
            app_env="production",
            secret_key="this-is-a-production-secret-key-with-32-chars",
            role_elevation_code="",
        )


def test_production_accepts_secure_settings() -> None:
    settings = Settings(
        app_env="production",
        secret_key="this-is-a-production-secret-key-with-32-chars",
        role_elevation_code="this-is-a-valid-role-elevation-code",
        cors_origins="https://plantify.example.com",
    )

    assert settings.app_env == "production"


def test_rejects_invalid_slo_target_availability() -> None:
    with pytest.raises(ValidationError, match="SLO_TARGET_AVAILABILITY"):
        Settings(slo_target_availability=1.5)


def test_rejects_invalid_slo_target_p95_seconds() -> None:
    with pytest.raises(ValidationError, match="SLO_TARGET_P95_SECONDS"):
        Settings(slo_target_p95_seconds=0)


def test_rejects_invalid_slo_min_requests_for_evaluation() -> None:
    with pytest.raises(ValidationError, match="SLO_MIN_REQUESTS_FOR_EVALUATION"):
        Settings(slo_min_requests_for_evaluation=0)
