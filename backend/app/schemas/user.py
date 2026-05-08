from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, field_validator

UserRole = Literal["farmer", "expert", "admin", "developer"]


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    avatar_b64: str | None = None
    created_at: datetime

    @field_validator("role", mode="before")
    @classmethod
    def extract_role_name(cls, v):
        if hasattr(v, "role_name"):
            # Map database roles to frontend expected values if necessary, or just return role_name
            # e.g., "System Development Team" -> "developer"
            name = v.role_name
            if "Farmer" in name or "Manager" in name: return "farmer"
            if "Expert" in name: return "expert"
            if "Admin" in name: return "admin"
            if "Development" in name: return "developer"
            return name.lower()
        return v

    model_config = {"from_attributes": True}


class UserRoleUpdateRequest(BaseModel):
    role: UserRole


class RoleCodeUpdateRequest(BaseModel):
    code: str
    role: UserRole


class UserProfilePostResponse(BaseModel):
    id: str
    created_at: datetime
    post_text: str
    ai_fish_species: str
    ai_disease: str
    ai_confidence_score: float
    image_b64: str | None = None
    likes_count: int
    comments_count: int


class UserProfileDetailResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    avatar_b64: str | None = None
    created_at: datetime
    posts_count: int
    posts: list[UserProfilePostResponse]

    @field_validator("role", mode="before")
    @classmethod
    def extract_role_name(cls, v):
        if hasattr(v, "role_name"):
            name = v.role_name
            if "Farmer" in name or "Manager" in name: return "farmer"
            if "Expert" in name: return "expert"
            if "Admin" in name: return "admin"
            if "Development" in name: return "developer"
            return name.lower()
        return v

    model_config = {"from_attributes": True}
