from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    kind: str
    message: str
    is_read: bool
    created_at: datetime
    actor_user_name: str | None = None
    post_id: str | None = None
    comment_id: str | None = None


class NotificationReadRequest(BaseModel):
    notification_id: str
