from uuid import uuid4

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    role_name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    privileges: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    users = relationship("User", back_populates="role")
