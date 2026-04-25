from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(32), default="farmer", index=True)
    avatar_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    scans = relationship("ScanHistory", back_populates="user", cascade="all,delete-orphan")
    community_likes = relationship("CommunityLike", back_populates="user", cascade="all,delete-orphan")
    community_comments = relationship("CommunityComment", back_populates="user", cascade="all,delete-orphan")
    community_comment_likes = relationship("CommunityCommentLike", back_populates="user", cascade="all,delete-orphan")
    notifications = relationship("Notification", foreign_keys="Notification.user_id", back_populates="user", cascade="all,delete-orphan")
    sent_notifications = relationship("Notification", foreign_keys="Notification.actor_user_id", back_populates="actor_user")
    sent_friend_requests = relationship("FriendRequest", foreign_keys="FriendRequest.sender_id", back_populates="sender", cascade="all,delete-orphan")
    received_friend_requests = relationship("FriendRequest", foreign_keys="FriendRequest.receiver_id", back_populates="receiver", cascade="all,delete-orphan")
    friendships_as_user_one = relationship("Friendship", foreign_keys="Friendship.user_one_id", back_populates="user_one", cascade="all,delete-orphan")
    friendships_as_user_two = relationship("Friendship", foreign_keys="Friendship.user_two_id", back_populates="user_two", cascade="all,delete-orphan")
    sent_direct_messages = relationship("DirectMessage", foreign_keys="DirectMessage.sender_id", back_populates="sender", cascade="all,delete-orphan")
    received_direct_messages = relationship("DirectMessage", foreign_keys="DirectMessage.receiver_id", back_populates="receiver", cascade="all,delete-orphan")
