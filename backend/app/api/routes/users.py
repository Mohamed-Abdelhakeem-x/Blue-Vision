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
from app.models.media_upload import MediaUpload
from app.models.analysis_history import AnalysisHistory
from app.models.biological_health import BiologicalHealth
from app.models.species_identification import SpeciesIdentification
from app.models.user import User
from app.models.role import Role
from app.models.fish_farm import FishFarm
from app.schemas.user import (
    RoleCodeUpdateRequest,
    UserProfileDetailResponse,
    UserProfilePostResponse,
    UserResponse,
    UserRoleUpdateRequest,
)
from app.services.label_parser import parse_fish_label
from app.services.profile_image_store import load_profile_image_b64, persist_profile_image
from app.services.scan_image_store import load_scan_image_b64
from app.services.upload_validation import validate_image_upload

router = APIRouter(prefix="/users", tags=["users"])

settings = get_settings()

def get_role_name(user: User) -> str:
    # Safely get the role name since we migrated from string to relationship
    # If the relationship is loaded, use it. Otherwise default.
    return getattr(user.role, "role_name", "farmer") if hasattr(user, "role") and user.role else "farmer"

@router.get("/me", response_model=UserResponse)
async def me(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    from sqlalchemy.orm import selectinload
    user_with_farms = (await session.execute(
        select(User).options(selectinload(User.fish_farms), selectinload(User.farm_memberships))
        .where(User.id == current_user.id)
    )).scalar_one_or_none()
    
    has_farm = False
    if user_with_farms:
        has_farm = bool(user_with_farms.fish_farms or user_with_farms.farm_memberships)

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=get_role_name(current_user),
        has_farm=has_farm,
        avatar_b64=load_profile_image_b64(current_user.avatar_sha256),
        created_at=current_user.created_at,
    )


@router.get("/me/profile", response_model=UserProfileDetailResponse)
async def my_profile(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> UserProfileDetailResponse:
    likes_subquery = (
        select(CommunityLike.upload_id.label("upload_id"), func.count(CommunityLike.id).label("likes_count"))
        .group_by(CommunityLike.upload_id)
        .subquery()
    )
    comments_subquery = (
        select(CommunityComment.upload_id.label("upload_id"), func.count(CommunityComment.id).label("comments_count"))
        .group_by(CommunityComment.upload_id)
        .subquery()
    )
    posts_stmt = (
        select(
            MediaUpload,
            func.coalesce(likes_subquery.c.likes_count, 0).label("likes_count"),
            func.coalesce(comments_subquery.c.comments_count, 0).label("comments_count"),
            AnalysisHistory,
            BiologicalHealth,
            SpeciesIdentification
        )
        .outerjoin(likes_subquery, likes_subquery.c.upload_id == MediaUpload.id)
        .outerjoin(comments_subquery, comments_subquery.c.upload_id == MediaUpload.id)
        .outerjoin(AnalysisHistory, AnalysisHistory.upload_id == MediaUpload.id)
        .outerjoin(BiologicalHealth, BiologicalHealth.history_id == AnalysisHistory.id)
        .outerjoin(SpeciesIdentification, SpeciesIdentification.upload_id == MediaUpload.id)
        .where(MediaUpload.user_id == current_user.id, MediaUpload.is_community == True)
        .order_by(MediaUpload.upload_time.desc())
    )
    post_rows = (await session.execute(posts_stmt)).all()

    posts = []
    for upload, likes_count, comments_count, analysis, bio_health, species_id in post_rows:
        ai_fish_species = species_id.scientific_name if species_id else "Unknown"
        ai_disease = bio_health.disease_type if bio_health else "Unknown"
        ai_confidence_score = species_id.confidence_score if species_id else 0.0

        posts.append(
            UserProfilePostResponse(
                id=upload.id,
                created_at=upload.upload_time,
                post_text=upload.post_text or "",
                ai_fish_species=ai_fish_species,
                ai_disease=ai_disease,
                ai_confidence_score=float(ai_confidence_score),
                image_b64=load_scan_image_b64(upload.file_path),
                likes_count=int(likes_count or 0),
                comments_count=int(comments_count or 0),
            )
        )

    return UserProfileDetailResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=get_role_name(current_user),
        avatar_b64=load_profile_image_b64(current_user.avatar_sha256),
        created_at=current_user.created_at,
        posts_count=len(posts),
        posts=posts,
    )


@router.patch("/me/profile", response_model=UserResponse)
async def update_my_profile(
    full_name: Annotated[str | None, Form()] = None,
    role: Annotated[str | None, Form()] = None, # Left intact for schema compatibility
    avatar: UploadFile | None = File(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    if full_name is not None and full_name.strip():
        current_user.full_name = full_name.strip()

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
        role=get_role_name(current_user),
        avatar_b64=load_profile_image_b64(current_user.avatar_sha256),
        created_at=current_user.created_at,
    )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    from app.models.refresh_token import RefreshToken
    from sqlalchemy import update
    import datetime
    
    # Invalidate all refresh tokens for this user
    now = datetime.datetime.now(datetime.timezone.utc)
    stmt = (
        update(RefreshToken)
        .where(RefreshToken.user_id == current_user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    await session.execute(stmt)
    
    # Delete the user. Because of `cascade="all,delete-orphan"` on `User.fish_farms` 
    # and `User.farm_memberships`, related core entries will be removed automatically.
    await session.delete(current_user)
    await session.commit()
    
    audit_event(
        event="users.delete_account",
        outcome="success",
        request=request,
        user_id=current_user.id,
        email=current_user.email
    )
    return None


@router.post("/me/create-farm")
async def create_personal_farm(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy.orm import selectinload
    user = (await session.execute(
        select(User)
        .options(selectinload(User.fish_farms), selectinload(User.farm_memberships))
        .where(User.id == current_user.id)
    )).scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.fish_farms or user.farm_memberships:
        raise HTTPException(status_code=400, detail="User already belongs to a farm.")
        
    role_stmt = select(Role).where(Role.role_name == "Owner")
    role = (await session.execute(role_stmt)).scalar_one_or_none()
    
    if not role:
        role = Role(role_name="Owner", privileges={})
        session.add(role)
        await session.flush()
        
    user.role_id = role.id
    
    farm = FishFarm(
        user_id=user.id,
        farm_name=f"{user.full_name}'s Farm"
    )
    session.add(farm)
    await session.commit()
    
    audit_event(
        event="users.create_farm",
        outcome="success",
        user_id=user.id,
        email=user.email,
    )
    
    return {"status": "ok", "message": "Farm created and user upgraded to Owner."}


@router.get("", response_model=list[UserResponse])
async def list_users(
    # Mocking admin requirement for now until role permissions are fully established with new DB models
    # _: User = Depends(require_roles("admin", "developer")), 
    session: AsyncSession = Depends(get_session),
) -> list[UserResponse]:
    result = await session.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    users_with_role = []
    for user in users:
        users_with_role.append(
            UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=get_role_name(user),
                avatar_b64=load_profile_image_b64(user.avatar_sha256),
                created_at=user.created_at,
            )
        )
    return users_with_role


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdateRequest,
    request: Request,
    # current_user: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Mocking for schema compatibility
    await session.commit()
    await session.refresh(user)
    audit_event(
        event="users.role_update",
        outcome="success",
        request=request,
        user_id="admin",
        target_user_id=user.id,
        target_role=payload.role,
    )
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=payload.role,
        avatar_b64=load_profile_image_b64(user.avatar_sha256),
        created_at=user.created_at,
    )


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

    # Fetch target role from database
    role_stmt = select(Role).where(Role.role_name == payload.role)
    target_role = (await session.execute(role_stmt)).scalar_one_or_none()
    if not target_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{payload.role}' not found"
        )

    current_user.role_id = target_role.id
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    audit_event(
        event="users.role_elevation",
        outcome="success",
        request=request,
        user_id=current_user.id,
    )
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=payload.role,
        avatar_b64=load_profile_image_b64(current_user.avatar_sha256),
        created_at=current_user.created_at,
    )
