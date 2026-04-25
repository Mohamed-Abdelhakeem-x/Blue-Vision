from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.user import UserRole

FriendshipStatus = Literal["none", "pending_sent", "pending_received", "friend"]


class SocialUserResponse(BaseModel):
    id: str
    full_name: str
    role: UserRole
    avatar_b64: str | None = None
    friendship_status: FriendshipStatus = "none"
    pending_request_id: str | None = None


class FriendRequestResponse(BaseModel):
    id: str
    status: str
    created_at: datetime
    sender: SocialUserResponse
    receiver: SocialUserResponse


class FriendResponse(BaseModel):
    user: SocialUserResponse
    friends_since: datetime
    unread_messages_count: int = 0


class DirectMessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    body: str
    is_own: bool
    is_read: bool
    created_at: datetime


class SocialOverviewResponse(BaseModel):
    discoverable_users: list[SocialUserResponse]
    received_requests: list[FriendRequestResponse]
    sent_requests: list[FriendRequestResponse]
    friends: list[FriendResponse]


class FriendRequestCreateRequest(BaseModel):
    receiver_id: str


class DirectMessageCreateRequest(BaseModel):
    receiver_id: str
    body: str


class ConversationResponse(BaseModel):
    friend: SocialUserResponse
    messages: list[DirectMessageResponse]
