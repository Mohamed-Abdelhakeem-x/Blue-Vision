"""Add social graph and direct messaging

Revision ID: 20260418_0009
Revises: 20260416_0008
Create Date: 2026-04-18 19:20:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260418_0009"
down_revision = "20260416_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "friend_requests",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("sender_id", sa.String(length=36), nullable=False),
        sa.Column("receiver_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["receiver_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sender_id", "receiver_id", "status", name="uq_friend_request_pending_state"),
    )
    op.create_index(op.f("ix_friend_requests_created_at"), "friend_requests", ["created_at"], unique=False)
    op.create_index(op.f("ix_friend_requests_receiver_id"), "friend_requests", ["receiver_id"], unique=False)
    op.create_index(op.f("ix_friend_requests_sender_id"), "friend_requests", ["sender_id"], unique=False)
    op.create_index(op.f("ix_friend_requests_status"), "friend_requests", ["status"], unique=False)

    op.create_table(
        "friendships",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_one_id", sa.String(length=36), nullable=False),
        sa.Column("user_two_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_one_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_two_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_one_id", "user_two_id", name="uq_friendship_pair"),
    )
    op.create_index(op.f("ix_friendships_created_at"), "friendships", ["created_at"], unique=False)
    op.create_index(op.f("ix_friendships_user_one_id"), "friendships", ["user_one_id"], unique=False)
    op.create_index(op.f("ix_friendships_user_two_id"), "friendships", ["user_two_id"], unique=False)

    op.create_table(
        "direct_messages",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("sender_id", sa.String(length=36), nullable=False),
        sa.Column("receiver_id", sa.String(length=36), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["receiver_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_direct_messages_created_at"), "direct_messages", ["created_at"], unique=False)
    op.create_index(op.f("ix_direct_messages_read_at"), "direct_messages", ["read_at"], unique=False)
    op.create_index(op.f("ix_direct_messages_receiver_id"), "direct_messages", ["receiver_id"], unique=False)
    op.create_index(op.f("ix_direct_messages_sender_id"), "direct_messages", ["sender_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_direct_messages_sender_id"), table_name="direct_messages")
    op.drop_index(op.f("ix_direct_messages_receiver_id"), table_name="direct_messages")
    op.drop_index(op.f("ix_direct_messages_read_at"), table_name="direct_messages")
    op.drop_index(op.f("ix_direct_messages_created_at"), table_name="direct_messages")
    op.drop_table("direct_messages")

    op.drop_index(op.f("ix_friendships_user_two_id"), table_name="friendships")
    op.drop_index(op.f("ix_friendships_user_one_id"), table_name="friendships")
    op.drop_index(op.f("ix_friendships_created_at"), table_name="friendships")
    op.drop_table("friendships")

    op.drop_index(op.f("ix_friend_requests_status"), table_name="friend_requests")
    op.drop_index(op.f("ix_friend_requests_sender_id"), table_name="friend_requests")
    op.drop_index(op.f("ix_friend_requests_receiver_id"), table_name="friend_requests")
    op.drop_index(op.f("ix_friend_requests_created_at"), table_name="friend_requests")
    op.drop_table("friend_requests")
