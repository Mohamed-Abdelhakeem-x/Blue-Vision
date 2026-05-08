from uuid import uuid4

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Pond(Base):
    __tablename__ = "ponds"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    farm_id: Mapped[str] = mapped_column(String(36), ForeignKey("fish_farms.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(100))
    size_sq_meters: Mapped[float | None] = mapped_column(Float, nullable=True)
    stocking_density: Mapped[float | None] = mapped_column(Float, nullable=True)

    farm = relationship("FishFarm", back_populates="ponds")
    environmental_data = relationship("EnvironmentalData", back_populates="pond", cascade="all,delete-orphan")
    media_uploads = relationship("MediaUpload", back_populates="pond", cascade="all,delete-orphan")
