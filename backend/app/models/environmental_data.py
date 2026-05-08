from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EnvironmentalData(Base):
    __tablename__ = "environmental_data"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    pond_id: Mapped[str] = mapped_column(String(36), ForeignKey("ponds.id", ondelete="CASCADE"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    dissolved_oxygen: Mapped[float | None] = mapped_column(Float, nullable=True)
    ammonia_level: Mapped[float | None] = mapped_column(Float, nullable=True)
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    ph_level: Mapped[float | None] = mapped_column(Float, nullable=True)

    pond = relationship("Pond", back_populates="environmental_data")
