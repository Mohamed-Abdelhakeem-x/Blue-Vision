"""Add scan entry kind for community posts

Revision ID: 20260416_0005
Revises: 20260416_0004
Create Date: 2026-04-16 00:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260416_0005"
down_revision = "20260416_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "scan_history",
        sa.Column("entry_kind", sa.String(length=20), nullable=False, server_default="scan"),
    )
    op.create_index(op.f("ix_scan_history_entry_kind"), "scan_history", ["entry_kind"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_scan_history_entry_kind"), table_name="scan_history")
    op.drop_column("scan_history", "entry_kind")
