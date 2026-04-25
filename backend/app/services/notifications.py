from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


async def create_notification(
    *,
    session: AsyncSession,
    user_id: str,
    actor_user_id: str | None,
    post_id: str | None,
    comment_id: str | None,
    kind: str,
    message: str,
) -> None:
    if actor_user_id is not None and actor_user_id == user_id:
        return

    session.add(
        Notification(
            user_id=user_id,
            actor_user_id=actor_user_id,
            post_id=post_id,
            comment_id=comment_id,
            kind=kind,
            message=message,
        )
    )
