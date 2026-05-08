from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MediaUpload(Base):
    __tablename__ = "media_uploads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    pond_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("ponds.id", ondelete="SET NULL"), index=True, nullable=True)
    file_path: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(50))
    resolution: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    upload_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    # Community fields migrated from old ScanHistory
    is_community: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    post_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="media_uploads")
    pond = relationship("Pond", back_populates="media_uploads")
    analysis_history = relationship("AnalysisHistory", back_populates="media_upload", uselist=False, cascade="all,delete-orphan")
    species_identifications = relationship("SpeciesIdentification", back_populates="media_upload", cascade="all,delete-orphan")
    community_likes = relationship("CommunityLike", back_populates="media_upload", cascade="all,delete-orphan")
    community_comments = relationship("CommunityComment", back_populates="media_upload", cascade="all,delete-orphan")
