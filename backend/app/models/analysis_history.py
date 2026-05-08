from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AnalysisHistory(Base):
    __tablename__ = "analysis_histories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    upload_id: Mapped[str] = mapped_column(String(36), ForeignKey("media_uploads.id", ondelete="CASCADE"), unique=True, index=True)
    analysis_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    suitability_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String(50), nullable=True)

    media_upload = relationship("MediaUpload", back_populates="analysis_history")
    biological_healths = relationship("BiologicalHealth", back_populates="analysis_history", cascade="all,delete-orphan")
    report = relationship("Report", back_populates="analysis_history", uselist=False, cascade="all,delete-orphan")
