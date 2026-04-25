"""Add community likes and comments

Revision ID: 20260416_0004
Revises: 20260328_0003
Create Date: 2026-04-16 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260416_0004"
down_revision = "20260328_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "community_likes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("scan_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["scan_id"], ["scan_history.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scan_id", "user_id", name="uq_community_likes_scan_user"),
    )
    op.create_index(op.f("ix_community_likes_created_at"), "community_likes", ["created_at"], unique=False)
    op.create_index(op.f("ix_community_likes_scan_id"), "community_likes", ["scan_id"], unique=False)
    op.create_index(op.f("ix_community_likes_user_id"), "community_likes", ["user_id"], unique=False)

    op.create_table(
        "community_comments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("scan_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["scan_id"], ["scan_history.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_community_comments_created_at"), "community_comments", ["created_at"], unique=False)
    op.create_index(op.f("ix_community_comments_scan_id"), "community_comments", ["scan_id"], unique=False)
    op.create_index(op.f("ix_community_comments_user_id"), "community_comments", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_community_comments_user_id"), table_name="community_comments")
    op.drop_index(op.f("ix_community_comments_scan_id"), table_name="community_comments")
    op.drop_index(op.f("ix_community_comments_created_at"), table_name="community_comments")
    op.drop_table("community_comments")

    op.drop_index(op.f("ix_community_likes_user_id"), table_name="community_likes")
    op.drop_index(op.f("ix_community_likes_scan_id"), table_name="community_likes")
    op.drop_index(op.f("ix_community_likes_created_at"), table_name="community_likes")
    op.drop_table("community_likes")
