from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FarmMember(Base):
    __tablename__ = "farm_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    farm_id: Mapped[str] = mapped_column(String(36), ForeignKey("fish_farms.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    
    # E.g., "Owner" or "Farm Manager"
    role: Mapped[str] = mapped_column(String(50), default="Farm Manager")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    farm = relationship("FishFarm", back_populates="members")
    user = relationship("User", back_populates="farm_memberships")
