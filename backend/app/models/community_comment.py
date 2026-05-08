from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CommunityComment(Base):
    __tablename__ = "community_comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    upload_id: Mapped[str] = mapped_column(String(36), ForeignKey("media_uploads.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    parent_comment_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("community_comments.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    media_upload = relationship("MediaUpload", back_populates="community_comments")
    user = relationship("User", back_populates="community_comments")
    parent_comment = relationship("CommunityComment", remote_side=[id], back_populates="replies")
    replies = relationship("CommunityComment", back_populates="parent_comment", cascade="all,delete-orphan")
    likes = relationship("CommunityCommentLike", back_populates="comment", cascade="all,delete-orphan")
