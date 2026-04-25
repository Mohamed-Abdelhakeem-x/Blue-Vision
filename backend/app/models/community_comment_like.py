from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CommunityCommentLike(Base):
    __tablename__ = "community_comment_likes"
    __table_args__ = (UniqueConstraint("comment_id", "user_id", name="uq_community_comment_likes_comment_user"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    comment_id: Mapped[str] = mapped_column(String(36), ForeignKey("community_comments.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    comment = relationship("CommunityComment", back_populates="likes")
    user = relationship("User", back_populates="community_comment_likes")
