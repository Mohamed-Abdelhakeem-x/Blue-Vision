"""Add comment replies and likes

Revision ID: 20260416_0006
Revises: 20260416_0005
Create Date: 2026-04-16 01:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260416_0006"
down_revision = "20260416_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    comment_columns = {column["name"] for column in inspector.get_columns("community_comments")}
    comment_indexes = {index["name"] for index in inspector.get_indexes("community_comments")}
    existing_tables = set(inspector.get_table_names())

    if "parent_comment_id" not in comment_columns:
        op.add_column("community_comments", sa.Column("parent_comment_id", sa.String(length=36), nullable=True))
    if op.f("ix_community_comments_parent_comment_id") not in comment_indexes:
        op.create_index(op.f("ix_community_comments_parent_comment_id"), "community_comments", ["parent_comment_id"], unique=False)

    if "community_comment_likes" not in existing_tables:
        op.create_table(
            "community_comment_likes",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("comment_id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["comment_id"], ["community_comments.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("comment_id", "user_id", name="uq_community_comment_likes_comment_user"),
        )
        op.create_index(op.f("ix_community_comment_likes_comment_id"), "community_comment_likes", ["comment_id"], unique=False)
        op.create_index(op.f("ix_community_comment_likes_created_at"), "community_comment_likes", ["created_at"], unique=False)
        op.create_index(op.f("ix_community_comment_likes_user_id"), "community_comment_likes", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_community_comment_likes_user_id"), table_name="community_comment_likes")
    op.drop_index(op.f("ix_community_comment_likes_created_at"), table_name="community_comment_likes")
    op.drop_index(op.f("ix_community_comment_likes_comment_id"), table_name="community_comment_likes")
    op.drop_table("community_comment_likes")

    op.drop_index(op.f("ix_community_comments_parent_comment_id"), table_name="community_comments")
    op.drop_column("community_comments", "parent_comment_id")
