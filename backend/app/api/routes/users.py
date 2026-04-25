import hashlib
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.audit import audit_event
from app.core.config import get_settings
from app.db.session import get_session
from app.models.community_comment import CommunityComment
from app.models.community_like import CommunityLike
from app.models.scan_history import ScanHistory
from app.models.user import User
from app.schemas.user import (
    RoleCodeUpdateRequest,
    UserProfileDetailResponse,
    UserProfilePostResponse,
    UserResponse,
    UserRoleUpdateRequest,
)
from app.services.label_parser import parse_disease_label
from app.services.profile_image_store import load_profile_image_b64, persist_profile_image
from app.services.scan_image_store import load_scan_image_b64
from app.services.upload_validation import validate_image_upload

router = APIRouter(prefix="/users", tags=["users"])

settings = get_settings()


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        avatar_b64=load_profile_image_b64(current_user.avatar_sha256),
        created_at=current_user.created_at,
    )


@router.get("/me/profile", response_model=UserProfileDetailResponse)
async def my_profile(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> UserProfileDetailResponse:
    likes_subquery = (
        select(CommunityLike.scan_id.label("scan_id"), func.count(CommunityLike.id).label("likes_count"))
        .group_by(CommunityLike.scan_id)
        .subquery()
    )
    comments_subquery = (
        select(CommunityComment.scan_id.label("scan_id"), func.count(CommunityComment.id).label("comments_count"))
        .group_by(CommunityComment.scan_id)
        .subquery()
    )
    posts_stmt = (
        select(
            ScanHistory,
            func.coalesce(likes_subquery.c.likes_count, 0).label("likes_count"),
            func.coalesce(comments_subquery.c.comments_count, 0).label("comments_count"),
        )
        .outerjoin(likes_subquery, likes_subquery.c.scan_id == ScanHistory.id)
        .outerjoin(comments_subquery, comments_subquery.c.scan_id == ScanHistory.id)
        .where(ScanHistory.user_id == current_user.id, ScanHistory.entry_kind == "community")
        .order_by(ScanHistory.created_at.desc())
    )
    post_rows = (await session.execute(posts_stmt)).all()

    posts = []
    for scan, likes_count, comments_count in post_rows:
        ai_plant_name, ai_disease = parse_disease_label(scan.disease_type)
        posts.append(
            UserProfilePostResponse(
                id=scan.id,
                created_at=scan.created_at,
                post_text=scan.recommendation,
                ai_plant_name=ai_plant_name,
                ai_disease=ai_disease,
                ai_confidence_score=float(scan.confidence_score),
                image_b64=load_scan_image_b64(scan.image_sha256),
                likes_count=int(likes_count or 0),
                comments_count=int(comments_count or 0),
            )
        )

    return UserProfileDetailResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        avatar_b64=load_profile_image_b64(current_user.avatar_sha256),
        created_at=current_user.created_at,
        posts_count=len(posts),
        posts=posts,
    )


@router.patch("/me/profile", response_model=UserResponse)
async def update_my_profile(
    full_name: Annotated[str | None, Form()] = None,
    role: Annotated[str | None, Form()] = None,
    avatar: UploadFile | None = File(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    if full_name is not None and full_name.strip():
        current_user.full_name = full_name.strip()

    if role is not None:
        normalized_role = role.strip().lower()
        if normalized_role not in {"farmer", "expert"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role must be farmer or expert")
        current_user.role = normalized_role

    if avatar is not None:
        avatar_bytes = await avatar.read()
        validate_image_upload(avatar, avatar_bytes, field_name="avatar")
        digest = hashlib.sha256(avatar_bytes).hexdigest()
        persist_profile_image(image_sha256=digest, image_bytes=avatar_bytes)
        current_user.avatar_sha256 = digest

    await session.commit()
    await session.refresh(current_user)
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        avatar_b64=load_profile_image_b64(current_user.avatar_sha256),
        created_at=current_user.created_at,
    )


@router.get("", response_model=list[UserResponse])
async def list_users(
    _: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> list[UserResponse]:
    result = await session.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [UserResponse.model_validate(user) for user in users]


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdateRequest,
    request: Request,
    current_user: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.role = payload.role
    await session.commit()
    await session.refresh(user)
    audit_event(
        event="users.role_update",
        outcome="success",
        request=request,
        user_id=current_user.id,
        target_user_id=user.id,
        target_role=user.role,
    )
    return UserResponse.model_validate(user)


@router.post("/self/role/by-code", response_model=UserResponse)
async def update_own_role_by_code(
    payload: RoleCodeUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    role_elevation_code = settings.role_elevation_code.strip()
    if not role_elevation_code:
        audit_event(
            event="users.role_elevation",
            outcome="denied",
            request=request,
            user_id=current_user.id,
            reason="role_elevation_disabled",
        )
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Role elevation is disabled")

    if payload.code != role_elevation_code:
        audit_event(
            event="users.role_elevation",
            outcome="denied",
            request=request,
            user_id=current_user.id,
            reason="invalid_code",
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid authorization code")

    current_user.role = payload.role
    await session.commit()
    await session.refresh(current_user)
    audit_event(
        event="users.role_elevation",
        outcome="success",
        request=request,
        user_id=current_user.id,
    )
    return UserResponse.model_validate(current_user)
