from uuid import uuid4

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BiologicalHealth(Base):
    __tablename__ = "biological_healths"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    history_id: Mapped[str] = mapped_column(String(36), ForeignKey("analysis_histories.id", ondelete="CASCADE"), index=True)
    health_status: Mapped[str] = mapped_column(String(100))
    disease_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    analysis_history = relationship("AnalysisHistory", back_populates="biological_healths")
