from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_session
from app.models.direct_message import DirectMessage
from app.models.friend_request import FriendRequest
from app.models.friendship import Friendship
from app.models.user import User
from app.schemas.social import (
    ConversationResponse,
    DirectMessageCreateRequest,
    DirectMessageResponse,
    FriendRequestCreateRequest,
    FriendRequestResponse,
    FriendResponse,
    SocialOverviewResponse,
    SocialUserResponse,
)
from app.services.notifications import create_notification
from app.services.profile_image_store import load_profile_image_b64

router = APIRouter(prefix="/social", tags=["social"])


def _pair(user_a: str, user_b: str) -> tuple[str, str]:
    return tuple(sorted((user_a, user_b)))


def _social_user_response(
    user: User,
    *,
    friendship_status: str = "none",
    pending_request_id: str | None = None,
) -> SocialUserResponse:
    return SocialUserResponse(
        id=user.id,
        full_name=user.full_name,
        role=user.role,
        avatar_b64=load_profile_image_b64(user.avatar_sha256),
        friendship_status=friendship_status,
        pending_request_id=pending_request_id,
    )


async def _get_user_or_404(session: AsyncSession, user_id: str) -> User:
    user = await session.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def _ensure_friendship(session: AsyncSession, user_a: str, user_b: str) -> Friendship | None:
    user_one_id, user_two_id = _pair(user_a, user_b)
    return await session.scalar(
        select(Friendship).where(
            Friendship.user_one_id == user_one_id,
            Friendship.user_two_id == user_two_id,
        )
    )


@router.get("/overview", response_model=SocialOverviewResponse)
async def social_overview(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> SocialOverviewResponse:
    users = (
        await session.execute(select(User).where(User.id != current_user.id).order_by(User.full_name.asc(), User.created_at.asc()))
    ).scalars().all()

    friendships = (
        await session.execute(
            select(Friendship).where(
                or_(Friendship.user_one_id == current_user.id, Friendship.user_two_id == current_user.id)
            )
        )
    ).scalars().all()
    friend_ids = {
        friendship.user_two_id if friendship.user_one_id == current_user.id else friendship.user_one_id
        for friendship in friendships
    }
    friendship_by_friend_id = {
        friendship.user_two_id if friendship.user_one_id == current_user.id else friendship.user_one_id: friendship
        for friendship in friendships
    }

    pending_requests = (
        await session.execute(
            select(FriendRequest).where(
                FriendRequest.status == "pending",
                or_(FriendRequest.sender_id == current_user.id, FriendRequest.receiver_id == current_user.id),
            )
        )
    ).scalars().all()

    sent_request_by_receiver_id = {
        request.receiver_id: request for request in pending_requests if request.sender_id == current_user.id
    }
    received_request_by_sender_id = {
        request.sender_id: request for request in pending_requests if request.receiver_id == current_user.id
    }

    unread_rows = (
        await session.execute(
            select(DirectMessage.sender_id, func.count(DirectMessage.id))
            .where(DirectMessage.receiver_id == current_user.id, DirectMessage.read_at.is_(None))
            .group_by(DirectMessage.sender_id)
        )
    ).all()
    unread_map = {sender_id: int(count) for sender_id, count in unread_rows}

    discoverable_users: list[SocialUserResponse] = []
    for user in users:
        if user.id in friend_ids:
            status_name = "friend"
            pending_request_id = None
        elif user.id in sent_request_by_receiver_id:
            status_name = "pending_sent"
            pending_request_id = sent_request_by_receiver_id[user.id].id
        elif user.id in received_request_by_sender_id:
            status_name = "pending_received"
            pending_request_id = received_request_by_sender_id[user.id].id
        else:
            status_name = "none"
            pending_request_id = None

        discoverable_users.append(
            _social_user_response(user, friendship_status=status_name, pending_request_id=pending_request_id)
        )

    user_map = {user.id: user for user in users}
    received_requests = [
        FriendRequestResponse(
            id=request.id,
            status=request.status,
            created_at=request.created_at,
            sender=_social_user_response(user_map[request.sender_id], friendship_status="pending_received", pending_request_id=request.id),
            receiver=_social_user_response(current_user, friendship_status="pending_received", pending_request_id=request.id),
        )
        for request in pending_requests
        if request.receiver_id == current_user.id and request.sender_id in user_map
    ]
    sent_requests = [
        FriendRequestResponse(
            id=request.id,
            status=request.status,
            created_at=request.created_at,
            sender=_social_user_response(current_user, friendship_status="pending_sent", pending_request_id=request.id),
            receiver=_social_user_response(user_map[request.receiver_id], friendship_status="pending_sent", pending_request_id=request.id),
        )
        for request in pending_requests
        if request.sender_id == current_user.id and request.receiver_id in user_map
    ]

    friends = [
        FriendResponse(
            user=_social_user_response(user_map[friend_id], friendship_status="friend"),
            friends_since=friendship_by_friend_id[friend_id].created_at,
            unread_messages_count=unread_map.get(friend_id, 0),
        )
        for friend_id in sorted(friend_ids, key=lambda friend_id: user_map[friend_id].full_name.lower())
        if friend_id in user_map
    ]

    return SocialOverviewResponse(
        discoverable_users=discoverable_users,
        received_requests=received_requests,
        sent_requests=sent_requests,
        friends=friends,
    )


@router.post("/friend-requests", response_model=FriendRequestResponse, status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    payload: FriendRequestCreateRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> FriendRequestResponse:
    if payload.receiver_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot send a friend request to yourself")

    receiver = await _get_user_or_404(session, payload.receiver_id)

    existing_friendship = await _ensure_friendship(session, current_user.id, receiver.id)
    if existing_friendship is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You are already friends")

    existing_request = await session.scalar(
        select(FriendRequest).where(
            FriendRequest.status == "pending",
            or_(
                and_(FriendRequest.sender_id == current_user.id, FriendRequest.receiver_id == receiver.id),
                and_(FriendRequest.sender_id == receiver.id, FriendRequest.receiver_id == current_user.id),
            ),
        )
    )
    if existing_request is not None:
        if existing_request.sender_id == current_user.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Friend request already sent")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This user already sent you a friend request")

    friend_request = FriendRequest(sender_id=current_user.id, receiver_id=receiver.id, status="pending")
    session.add(friend_request)
    await create_notification(
        session=session,
        user_id=receiver.id,
        actor_user_id=current_user.id,
        post_id=None,
        comment_id=None,
        kind="friend_request",
        message=f"{current_user.full_name} sent you a friend request.",
    )
    await session.commit()
    await session.refresh(friend_request)

    return FriendRequestResponse(
        id=friend_request.id,
        status=friend_request.status,
        created_at=friend_request.created_at,
        sender=_social_user_response(current_user, friendship_status="pending_sent", pending_request_id=friend_request.id),
        receiver=_social_user_response(receiver, friendship_status="pending_sent", pending_request_id=friend_request.id),
    )


@router.post("/friend-requests/{request_id}/accept", response_model=FriendRequestResponse)
async def accept_friend_request(
    request_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> FriendRequestResponse:
    friend_request = await session.scalar(select(FriendRequest).where(FriendRequest.id == request_id))
    if friend_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found")
    if friend_request.receiver_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to accept this request")
    if friend_request.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This request is no longer pending")

    sender = await _get_user_or_404(session, friend_request.sender_id)
    user_one_id, user_two_id = _pair(friend_request.sender_id, friend_request.receiver_id)
    existing_friendship = await _ensure_friendship(session, user_one_id, user_two_id)
    if existing_friendship is None:
        session.add(Friendship(user_one_id=user_one_id, user_two_id=user_two_id))

    friend_request.status = "accepted"
    friend_request.responded_at = datetime.utcnow()

    await create_notification(
        session=session,
        user_id=sender.id,
        actor_user_id=current_user.id,
        post_id=None,
        comment_id=None,
        kind="friend_accept",
        message=f"{current_user.full_name} accepted your friend request.",
    )
    await session.commit()
    await session.refresh(friend_request)

    return FriendRequestResponse(
        id=friend_request.id,
        status=friend_request.status,
        created_at=friend_request.created_at,
        sender=_social_user_response(sender, friendship_status="friend"),
        receiver=_social_user_response(current_user, friendship_status="friend"),
    )


@router.post("/friend-requests/{request_id}/reject", response_model=FriendRequestResponse)
async def reject_friend_request(
    request_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> FriendRequestResponse:
    friend_request = await session.scalar(select(FriendRequest).where(FriendRequest.id == request_id))
    if friend_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found")
    if current_user.id not in {friend_request.sender_id, friend_request.receiver_id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    if friend_request.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This request is no longer pending")

    sender = await _get_user_or_404(session, friend_request.sender_id)
    receiver = await _get_user_or_404(session, friend_request.receiver_id)
    friend_request.status = "rejected"
    friend_request.responded_at = datetime.utcnow()
    await session.commit()
    await session.refresh(friend_request)

    sender_status = "none" if friend_request.sender_id == current_user.id else "pending_sent"
    receiver_status = "none" if friend_request.receiver_id == current_user.id else "pending_received"
    return FriendRequestResponse(
        id=friend_request.id,
        status=friend_request.status,
        created_at=friend_request.created_at,
        sender=_social_user_response(sender, friendship_status=sender_status),
        receiver=_social_user_response(receiver, friendship_status=receiver_status),
    )


@router.get("/conversations/{friend_id}", response_model=ConversationResponse)
async def get_conversation(
    friend_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ConversationResponse:
    friend = await _get_user_or_404(session, friend_id)
    if await _ensure_friendship(session, current_user.id, friend.id) is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only message your friends")

    messages = (
        await session.execute(
            select(DirectMessage)
            .where(
                or_(
                    and_(DirectMessage.sender_id == current_user.id, DirectMessage.receiver_id == friend.id),
                    and_(DirectMessage.sender_id == friend.id, DirectMessage.receiver_id == current_user.id),
                )
            )
            .order_by(DirectMessage.created_at.asc())
        )
    ).scalars().all()

    unread_incoming = [
        message
        for message in messages
        if message.sender_id == friend.id and message.receiver_id == current_user.id and message.read_at is None
    ]
    now = datetime.utcnow()
    for message in unread_incoming:
        message.read_at = now

    if unread_incoming:
        await session.commit()

    return ConversationResponse(
        friend=_social_user_response(friend, friendship_status="friend"),
        messages=[
            DirectMessageResponse(
                id=message.id,
                sender_id=message.sender_id,
                receiver_id=message.receiver_id,
                body=message.body,
                is_own=message.sender_id == current_user.id,
                is_read=message.read_at is not None,
                created_at=message.created_at,
            )
            for message in messages
        ],
    )


@router.post("/messages", response_model=DirectMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_direct_message(
    payload: DirectMessageCreateRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DirectMessageResponse:
    message_body = payload.body.strip()
    if not message_body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")
    if payload.receiver_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot message yourself")

    receiver = await _get_user_or_404(session, payload.receiver_id)
    if await _ensure_friendship(session, current_user.id, receiver.id) is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only message your friends")

    direct_message = DirectMessage(sender_id=current_user.id, receiver_id=receiver.id, body=message_body)
    session.add(direct_message)
    await create_notification(
        session=session,
        user_id=receiver.id,
        actor_user_id=current_user.id,
        post_id=None,
        comment_id=None,
        kind="direct_message",
        message=f"{current_user.full_name} sent you a new message.",
    )
    await session.commit()
    await session.refresh(direct_message)

    return DirectMessageResponse(
        id=direct_message.id,
        sender_id=direct_message.sender_id,
        receiver_id=direct_message.receiver_id,
        body=direct_message.body,
        is_own=True,
        is_read=False,
        created_at=direct_message.created_at,
    )
