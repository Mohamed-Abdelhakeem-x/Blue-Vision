from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr

UserRole = Literal["farmer", "expert", "admin", "developer"]


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    avatar_b64: str | None = None
    created_at: datetime

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
    ai_plant_name: str
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
