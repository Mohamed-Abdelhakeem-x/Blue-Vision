"""Initial schema

Revision ID: 20260318_0001
Revises: None
Create Date: 2026-03-18 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260318_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "plant_metadata",
        sa.Column("disease_type", sa.String(length=180), nullable=False),
        sa.Column("plant_family", sa.String(length=120), nullable=False),
        sa.Column("treatment_recommendation", sa.Text(), nullable=False),
        sa.Column("severity_hint", sa.String(length=32), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("disease_type"),
    )

    op.create_table(
        "scan_history",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("disease_type", sa.String(length=180), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=False),
        sa.Column("recommendation", sa.Text(), nullable=False),
        sa.Column("domain", sa.String(length=50), nullable=False),
        sa.Column("image_sha256", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_scan_history_created_at"), "scan_history", ["created_at"], unique=False)
    op.create_index(op.f("ix_scan_history_disease_type"), "scan_history", ["disease_type"], unique=False)
    op.create_index(op.f("ix_scan_history_image_sha256"), "scan_history", ["image_sha256"], unique=False)
    op.create_index(op.f("ix_scan_history_user_id"), "scan_history", ["user_id"], unique=False)

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(op.f("ix_refresh_tokens_expires_at"), "refresh_tokens", ["expires_at"], unique=False)
    op.create_index(op.f("ix_refresh_tokens_token_hash"), "refresh_tokens", ["token_hash"], unique=True)
    op.create_index(op.f("ix_refresh_tokens_user_id"), "refresh_tokens", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_refresh_tokens_user_id"), table_name="refresh_tokens")
    op.drop_index(op.f("ix_refresh_tokens_token_hash"), table_name="refresh_tokens")
    op.drop_index(op.f("ix_refresh_tokens_expires_at"), table_name="refresh_tokens")
    op.drop_table("refresh_tokens")

    op.drop_index(op.f("ix_scan_history_user_id"), table_name="scan_history")
    op.drop_index(op.f("ix_scan_history_image_sha256"), table_name="scan_history")
    op.drop_index(op.f("ix_scan_history_disease_type"), table_name="scan_history")
    op.drop_index(op.f("ix_scan_history_created_at"), table_name="scan_history")
    op.drop_table("scan_history")

    op.drop_table("plant_metadata")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
