from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ScanHistory(Base):
    __tablename__ = "scan_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    disease_type: Mapped[str] = mapped_column(String(180), index=True)
    confidence_score: Mapped[float] = mapped_column(Float)
    recommendation: Mapped[str] = mapped_column(Text)
    domain: Mapped[str] = mapped_column(String(50), default="color")
    image_sha256: Mapped[str] = mapped_column(String(64), index=True)
    entry_kind: Mapped[str] = mapped_column(String(20), default="scan", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="scans")
    community_likes = relationship("CommunityLike", back_populates="scan", cascade="all,delete-orphan")
    community_comments = relationship("CommunityComment", back_populates="scan", cascade="all,delete-orphan")
