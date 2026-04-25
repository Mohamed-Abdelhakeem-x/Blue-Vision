from datetime import datetime

from pydantic import BaseModel, Field


class CommunityCommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=1000)
    parent_comment_id: str | None = None


class CommunityCommentUpdate(BaseModel):
    body: str = Field(min_length=1, max_length=1000)


class CommunityCommentResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_role: str
    body: str
    parent_comment_id: str | None
    created_at: datetime
    is_owner: bool
    is_expert: bool
    likes_count: int
    liked_by_current_user: bool


class CommunityPostResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    plant_name: str
    disease: str
    disease_type: str
    entry_kind: str
    created_at: datetime
    image_b64: str | None = None
    post_text: str
    ai_plant_name: str
    ai_disease: str
    ai_treatment_recommendation: str
    ai_confidence_score: float
    likes_count: int
    comments_count: int
    liked_by_current_user: bool
    title: str | None = None


class CommunityPostSuggestionResponse(BaseModel):
    normalized_problem: str
    predicted_plant_name: str
    predicted_disease: str
    treatment_recommendation: str
    confidence_score: float
    is_plant: bool


class CommunityNormalizedTextResponse(BaseModel):
    normalized_text: str


class CommunityFeedPageResponse(BaseModel):
    items: list[CommunityPostResponse]
    next_offset: int | None


class CommunityPostDetailResponse(CommunityPostResponse):
    comments: list[CommunityCommentResponse]
