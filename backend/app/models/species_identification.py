from uuid import uuid4

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SpeciesIdentification(Base):
    __tablename__ = "species_identifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    upload_id: Mapped[str] = mapped_column(String(36), ForeignKey("media_uploads.id", ondelete="CASCADE"), index=True)
    scientific_name: Mapped[str] = mapped_column(String(150))
    count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    growth_stage: Mapped[str | None] = mapped_column(String(50), nullable=True)

    media_upload = relationship("MediaUpload", back_populates="species_identifications")
