"""Enforce SQLite integrity constraints

Revision ID: 20260328_0003
Revises: 20260319_0002
Create Date: 2026-03-28 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260328_0003"
down_revision = "20260319_0002"
branch_labels = None
depends_on = None


def _rebuild_users_with_constraints() -> None:
    op.execute(
        """
        CREATE TABLE users_new (
            id VARCHAR(36) NOT NULL,
            email VARCHAR(255) NOT NULL,
            full_name VARCHAR(120) NOT NULL,
            hashed_password VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL,
            role VARCHAR(32) NOT NULL DEFAULT 'farmer',
            PRIMARY KEY (id),
            UNIQUE (email),
            CONSTRAINT ck_users_role_valid CHECK (role IN ('farmer', 'expert', 'admin', 'developer'))
        )
        """
    )

    op.execute(
        """
        INSERT INTO users_new (id, email, full_name, hashed_password, created_at, role)
        SELECT id, email, full_name, hashed_password, created_at, COALESCE(role, 'farmer')
        FROM users
        """
    )

    op.drop_table("users")
    op.rename_table("users_new", "users")
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)


def _rebuild_users_without_constraints() -> None:
    op.execute(
        """
        CREATE TABLE users_new (
            id VARCHAR(36) NOT NULL,
            email VARCHAR(255) NOT NULL,
            full_name VARCHAR(120) NOT NULL,
            hashed_password VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL,
            role VARCHAR(32) NOT NULL DEFAULT 'farmer',
            PRIMARY KEY (id),
            UNIQUE (email)
        )
        """
    )

    op.execute(
        """
        INSERT INTO users_new (id, email, full_name, hashed_password, created_at, role)
        SELECT id, email, full_name, hashed_password, created_at, role
        FROM users
        """
    )

    op.drop_table("users")
    op.rename_table("users_new", "users")
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)


def _rebuild_scan_history_with_constraints() -> None:
    op.execute(
        """
        CREATE TABLE scan_history_new (
            id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36) NOT NULL,
            disease_type VARCHAR(180) NOT NULL,
            confidence_score FLOAT NOT NULL,
            recommendation TEXT NOT NULL,
            domain VARCHAR(50) NOT NULL,
            image_sha256 VARCHAR(64) NOT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
            CONSTRAINT ck_scan_history_confidence_range CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
            CONSTRAINT ck_scan_history_domain_valid CHECK (domain IN ('color', 'grayscale', 'segmented'))
        )
        """
    )

    op.execute(
        """
        INSERT INTO scan_history_new (
            id, user_id, disease_type, confidence_score, recommendation, domain, image_sha256, created_at
        )
        SELECT
            id, user_id, disease_type, confidence_score, recommendation, domain, image_sha256, created_at
        FROM scan_history
        """
    )

    op.drop_table("scan_history")
    op.rename_table("scan_history_new", "scan_history")
    op.create_index(op.f("ix_scan_history_created_at"), "scan_history", ["created_at"], unique=False)
    op.create_index(op.f("ix_scan_history_disease_type"), "scan_history", ["disease_type"], unique=False)
    op.create_index(op.f("ix_scan_history_image_sha256"), "scan_history", ["image_sha256"], unique=False)
    op.create_index(op.f("ix_scan_history_user_id"), "scan_history", ["user_id"], unique=False)


def _rebuild_scan_history_without_constraints() -> None:
    op.execute(
        """
        CREATE TABLE scan_history_new (
            id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36) NOT NULL,
            disease_type VARCHAR(180) NOT NULL,
            confidence_score FLOAT NOT NULL,
            recommendation TEXT NOT NULL,
            domain VARCHAR(50) NOT NULL,
            image_sha256 VARCHAR(64) NOT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """
    )

    op.execute(
        """
        INSERT INTO scan_history_new (
            id, user_id, disease_type, confidence_score, recommendation, domain, image_sha256, created_at
        )
        SELECT
            id, user_id, disease_type, confidence_score, recommendation, domain, image_sha256, created_at
        FROM scan_history
        """
    )

    op.drop_table("scan_history")
    op.rename_table("scan_history_new", "scan_history")
    op.create_index(op.f("ix_scan_history_created_at"), "scan_history", ["created_at"], unique=False)
    op.create_index(op.f("ix_scan_history_disease_type"), "scan_history", ["disease_type"], unique=False)
    op.create_index(op.f("ix_scan_history_image_sha256"), "scan_history", ["image_sha256"], unique=False)
    op.create_index(op.f("ix_scan_history_user_id"), "scan_history", ["user_id"], unique=False)


def upgrade() -> None:
    op.execute("PRAGMA foreign_keys=OFF")
    try:
        _rebuild_users_with_constraints()
        _rebuild_scan_history_with_constraints()
    finally:
        op.execute("PRAGMA foreign_keys=ON")


def downgrade() -> None:
    op.execute("PRAGMA foreign_keys=OFF")
    try:
        _rebuild_users_without_constraints()
        _rebuild_scan_history_without_constraints()
    finally:
        op.execute("PRAGMA foreign_keys=ON")
