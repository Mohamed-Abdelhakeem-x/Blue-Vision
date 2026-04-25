from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_session
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[NotificationResponse]:
    stmt = (
        select(Notification, User.full_name.label("actor_user_name"))
        .outerjoin(User, User.id == Notification.actor_user_id)
        .where(Notification.user_id == current_user.id)
        .order_by(desc(Notification.created_at))
        .limit(100)
    )
    rows = (await session.execute(stmt)).all()
    return [
        NotificationResponse(
            id=notification.id,
            kind=notification.kind,
            message=notification.message,
            is_read=notification.is_read,
            created_at=notification.created_at,
            actor_user_name=actor_user_name,
            post_id=notification.post_id,
            comment_id=notification.comment_id,
        )
        for notification, actor_user_name in rows
    ]


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> NotificationResponse:
    stmt = select(Notification, User.full_name.label("actor_user_name")).outerjoin(User, User.id == Notification.actor_user_id).where(Notification.id == notification_id)
    row = (await session.execute(stmt)).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification, actor_user_name = row
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    notification.is_read = True
    await session.commit()
    await session.refresh(notification)
    return NotificationResponse(
        id=notification.id,
        kind=notification.kind,
        message=notification.message,
        is_read=notification.is_read,
        created_at=notification.created_at,
        actor_user_name=actor_user_name,
        post_id=notification.post_id,
        comment_id=notification.comment_id,
    )
