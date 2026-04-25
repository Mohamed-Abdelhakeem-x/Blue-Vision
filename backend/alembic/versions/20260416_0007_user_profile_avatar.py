"""Add user avatar column

Revision ID: 20260416_0007
Revises: 20260416_0006
Create Date: 2026-04-16 01:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260416_0007"
down_revision = "20260416_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_sha256", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_sha256")
