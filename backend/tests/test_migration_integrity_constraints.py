from datetime import UTC, datetime
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from sqlalchemy.exc import IntegrityError

from app.core.config import get_settings


@pytest.fixture()
def alembic_config(monkeypatch, tmp_path):
    backend_dir = Path(__file__).resolve().parents[1]
    db_path = tmp_path / "migration-integrity.db"

    monkeypatch.setenv("SQLITE_PATH", str(db_path))
    get_settings.cache_clear()

    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str((backend_dir / "alembic").as_posix()))

    return config, db_path


def test_integrity_constraints_enforced_after_migration(alembic_config):
    config, db_path = alembic_config
    command.upgrade(config, "head")

    engine = sa.create_engine(f"sqlite:///{db_path}", future=True)
    inspector = sa.inspect(engine)

    user_checks = {check["name"] for check in inspector.get_check_constraints("users")}
    scan_checks = {check["name"] for check in inspector.get_check_constraints("scan_history")}

    assert "ck_users_role_valid" in user_checks
    assert "ck_scan_history_confidence_range" in scan_checks
    assert "ck_scan_history_domain_valid" in scan_checks

    created_at = datetime.now(UTC).isoformat()
    with engine.begin() as conn:
        conn.execute(
            sa.text(
                """
                INSERT INTO users (id, email, full_name, hashed_password, created_at, role)
                VALUES (:id, :email, :full_name, :hashed_password, :created_at, :role)
                """
            ),
            {
                "id": "user-valid-1",
                "email": "valid@example.com",
                "full_name": "Valid User",
                "hashed_password": "hashed",
                "created_at": created_at,
                "role": "farmer",
            },
        )

    with pytest.raises(IntegrityError):
        with engine.begin() as conn:
            conn.execute(
                sa.text(
                    """
                    INSERT INTO users (id, email, full_name, hashed_password, created_at, role)
                    VALUES (:id, :email, :full_name, :hashed_password, :created_at, :role)
                    """
                ),
                {
                    "id": "user-invalid-role",
                    "email": "invalid-role@example.com",
                    "full_name": "Invalid Role",
                    "hashed_password": "hashed",
                    "created_at": created_at,
                    "role": "owner",
                },
            )

    with pytest.raises(IntegrityError):
        with engine.begin() as conn:
            conn.execute(
                sa.text(
                    """
                    INSERT INTO scan_history (
                        id, user_id, disease_type, confidence_score, recommendation, domain, image_sha256, created_at
                    ) VALUES (
                        :id, :user_id, :disease_type, :confidence_score, :recommendation, :domain, :image_sha256, :created_at
                    )
                    """
                ),
                {
                    "id": "scan-invalid-domain",
                    "user_id": "user-valid-1",
                    "disease_type": "Tomato___healthy",
                    "confidence_score": 0.5,
                    "recommendation": "noop",
                    "domain": "infrared",
                    "image_sha256": "a" * 64,
                    "created_at": created_at,
                },
            )

    with pytest.raises(IntegrityError):
        with engine.begin() as conn:
            conn.execute(
                sa.text(
                    """
                    INSERT INTO scan_history (
                        id, user_id, disease_type, confidence_score, recommendation, domain, image_sha256, created_at
                    ) VALUES (
                        :id, :user_id, :disease_type, :confidence_score, :recommendation, :domain, :image_sha256, :created_at
                    )
                    """
                ),
                {
                    "id": "scan-invalid-confidence",
                    "user_id": "user-valid-1",
                    "disease_type": "Tomato___healthy",
                    "confidence_score": 1.5,
                    "recommendation": "noop",
                    "domain": "color",
                    "image_sha256": "b" * 64,
                    "created_at": created_at,
                },
            )

    with engine.begin() as conn:
        conn.execute(
            sa.text(
                """
                INSERT INTO scan_history (
                    id, user_id, disease_type, confidence_score, recommendation, domain, image_sha256, created_at
                ) VALUES (
                    :id, :user_id, :disease_type, :confidence_score, :recommendation, :domain, :image_sha256, :created_at
                )
                """
            ),
            {
                "id": "scan-valid-1",
                "user_id": "user-valid-1",
                "disease_type": "Tomato___healthy",
                "confidence_score": 0.7,
                "recommendation": "noop",
                "domain": "color",
                "image_sha256": "c" * 64,
                "created_at": created_at,
            },
        )

    engine.dispose()
