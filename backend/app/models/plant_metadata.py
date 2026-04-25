from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PlantMetadata(Base):
    __tablename__ = "plant_metadata"

    disease_type: Mapped[str] = mapped_column(String(180), primary_key=True)
    plant_family: Mapped[str] = mapped_column(String(120), default="unknown")
    treatment_recommendation: Mapped[str] = mapped_column(Text)
    severity_hint: Mapped[str] = mapped_column(String(32), default="medium")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
