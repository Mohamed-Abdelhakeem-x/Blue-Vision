from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CommunityLike(Base):
    __tablename__ = "community_likes"
    __table_args__ = (UniqueConstraint("scan_id", "user_id", name="uq_community_likes_scan_user"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    scan_id: Mapped[str] = mapped_column(String(36), ForeignKey("scan_history.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    scan = relationship("ScanHistory", back_populates="community_likes")
    user = relationship("User", back_populates="community_likes")
