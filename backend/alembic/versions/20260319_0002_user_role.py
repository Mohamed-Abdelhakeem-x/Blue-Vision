"""Add role to users

Revision ID: 20260319_0002
Revises: 20260318_0001
Create Date: 2026-03-19 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260319_0002"
down_revision = "20260318_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    columns = {column["name"] for column in inspector.get_columns("users")}
    if "role" not in columns:
        op.add_column("users", sa.Column("role", sa.String(length=32), nullable=False, server_default="farmer"))

    indexes = {index["name"] for index in inspector.get_indexes("users")}
    role_index_name = op.f("ix_users_role")
    if role_index_name not in indexes:
        op.create_index(role_index_name, "users", ["role"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    indexes = {index["name"] for index in inspector.get_indexes("users")}
    role_index_name = op.f("ix_users_role")
    if role_index_name in indexes:
        op.drop_index(role_index_name, table_name="users")

    columns = {column["name"] for column in inspector.get_columns("users")}
    if "role" in columns:
        op.drop_column("users", "role")
