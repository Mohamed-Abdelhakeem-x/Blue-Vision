import hashlib
import re
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import Select, case, delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_session
from app.models.community_comment import CommunityComment
from app.models.community_comment_like import CommunityCommentLike
from app.models.community_like import CommunityLike
from app.models.media_upload import MediaUpload
from app.models.analysis_history import AnalysisHistory
from app.models.biological_health import BiologicalHealth
from app.models.species_identification import SpeciesIdentification
from app.models.user import User
from app.schemas.community import (
    CommunityCommentCreate,
    CommunityCommentResponse,
    CommunityCommentUpdate,
    CommunityFeedPageResponse,
    CommunityNormalizedTextResponse,
    CommunityPostDetailResponse,
    CommunityPostResponse,
    CommunityPostSuggestionResponse,
)
from app.services.label_parser import parse_fish_label
from app.services.scan_image_store import load_scan_image_b64
from app.services.scan_image_store import persist_scan_image
from app.services.notifications import create_notification
from app.services.recommendations import recommendation_for_label
from app.services.text_normalization import normalize_user_text
from app.services.upload_validation import validate_image_upload

router = APIRouter(prefix="/community", tags=["community"])


def _slugify_label_part(value: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "_", value.strip())
    normalized = re.sub(r"_+", "_", normalized).strip("_")
    return normalized or "Unknown"


def _post_base_stmt(current_user_id: str) -> Select:
    likes_subquery = (
        select(
            CommunityLike.upload_id.label("upload_id"),
            func.count(CommunityLike.id).label("likes_count"),
        )
        .group_by(CommunityLike.upload_id)
        .subquery()
    )
    comments_subquery = (
        select(
            CommunityComment.upload_id.label("upload_id"),
            func.count(CommunityComment.id).label("comments_count"),
        )
        .group_by(CommunityComment.upload_id)
        .subquery()
    )
    liked_subquery = (
        select(CommunityLike.upload_id.label("upload_id"))
        .where(CommunityLike.user_id == current_user_id)
        .subquery()
    )

    return (
        select(
            MediaUpload,
            User.full_name.label("user_name"),
            func.coalesce(likes_subquery.c.likes_count, 0).label("likes_count"),
            func.coalesce(comments_subquery.c.comments_count, 0).label("comments_count"),
            case((liked_subquery.c.upload_id.is_not(None), True), else_=False).label("liked_by_current_user"),
            AnalysisHistory,
            BiologicalHealth,
            SpeciesIdentification
        )
        .join(User, User.id == MediaUpload.user_id)
        .outerjoin(likes_subquery, likes_subquery.c.upload_id == MediaUpload.id)
        .outerjoin(comments_subquery, comments_subquery.c.upload_id == MediaUpload.id)
        .outerjoin(liked_subquery, liked_subquery.c.upload_id == MediaUpload.id)
        .outerjoin(AnalysisHistory, AnalysisHistory.upload_id == MediaUpload.id)
        .outerjoin(BiologicalHealth, BiologicalHealth.history_id == AnalysisHistory.id)
        .outerjoin(SpeciesIdentification, SpeciesIdentification.upload_id == MediaUpload.id)
        .where(MediaUpload.is_community == True)
    )


def _serialize_post(row) -> CommunityPostResponse:
    upload, user_name, likes_count, comments_count, liked_by_current_user, analysis, bio_health, species_id = row
    
    ai_fish_species = species_id.scientific_name if species_id else "Unknown"
    ai_disease = bio_health.disease_type if bio_health else "Unknown"
    ai_treatment_recommendation = "No recommendation available."
    ai_confidence_score = species_id.confidence_score if species_id else 0.0

    return CommunityPostResponse(
        id=upload.id,
        user_id=upload.user_id,
        user_name=user_name,
        fish_species=ai_fish_species,
        disease=ai_disease,
        health_status=bio_health.health_status if bio_health else "Unknown",
        entry_kind="community",
        created_at=upload.upload_time,
        image_b64=load_scan_image_b64(upload.file_path),
        post_text=upload.post_text or "",
        ai_fish_species=ai_fish_species,
        ai_disease=ai_disease,
        ai_treatment_recommendation=ai_treatment_recommendation,
        ai_confidence_score=float(ai_confidence_score),
        likes_count=int(likes_count or 0),
        comments_count=int(comments_count or 0),
        liked_by_current_user=bool(liked_by_current_user),
        title=upload.title,
    )


@router.get("/posts", response_model=CommunityFeedPageResponse)
async def list_posts(
    sort: str = Query(default="newest", pattern="^(newest|oldest|top)$"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommunityFeedPageResponse:
    stmt = _post_base_stmt(current_user.id)

    if sort == "oldest":
        stmt = stmt.order_by(MediaUpload.upload_time.asc())
    elif sort == "top":
        stmt = stmt.order_by(desc("likes_count"), desc("comments_count"), MediaUpload.upload_time.desc())
    else:
        stmt = stmt.order_by(MediaUpload.upload_time.desc())

    result = await session.execute(stmt.offset(offset).limit(limit + 1))
    rows = result.all()
    items = [_serialize_post(row) for row in rows[:limit]]
    next_offset = offset + limit if len(rows) > limit else None
    return CommunityFeedPageResponse(items=items, next_offset=next_offset)


@router.get("/normalize-text", response_model=CommunityNormalizedTextResponse)
async def normalize_text_preview(
    text: str = Query(default="", max_length=1000),
    field: str = Query(default="body", pattern="^(body|plant_name|fish_species)$"),
    current_user: User = Depends(get_current_user),
) -> CommunityNormalizedTextResponse:
    _ = current_user
    return CommunityNormalizedTextResponse(normalized_text=normalize_user_text(text, field=field))


@router.post("/posts/suggestion", response_model=CommunityPostSuggestionResponse)
async def preview_post_suggestion(
    request: Request,
    image: Annotated[UploadFile, File(...)],
    problem: Annotated[str, Form(...)],
    current_user: User = Depends(get_current_user),
) -> CommunityPostSuggestionResponse:
    _ = current_user
    image_bytes = await image.read()
    validate_image_upload(image, image_bytes, field_name="image")

    normalized_problem = normalize_user_text(problem, field="body")
    if not normalized_problem:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Problem text is required")

    ai_service = getattr(request.app.state, "ai_service", None)
    if ai_service is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI service not ready")

    prediction = ai_service.predict(image_bytes)
    if not bool(prediction.get("is_fish", True)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The uploaded image does not appear to contain a fish. Please upload a clearer fish image.",
        )

    predicted_fish_species, predicted_disease = parse_fish_label(str(prediction["label"]))
    treatment_recommendation = recommendation_for_label(str(prediction["label"]))
    return CommunityPostSuggestionResponse(
        normalized_problem=normalized_problem,
        predicted_fish_species=normalize_user_text(predicted_fish_species, field="plant_name"),
        predicted_disease=predicted_disease,
        treatment_recommendation=treatment_recommendation,
        confidence_score=float(prediction["confidence"]),
        is_fish=bool(prediction.get("is_fish", True)),
    )


@router.post("/posts", response_model=CommunityPostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    image: Annotated[UploadFile, File(...)],
    fish_species: Annotated[str, Form(...)],
    problem: Annotated[str, Form(...)],
    ai_health_status: Annotated[str, Form(...)],
    ai_confidence_score: Annotated[float, Form(...)],
    title: Annotated[str | None, Form(...)] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommunityPostResponse:
    image_bytes = await image.read()
    validate_image_upload(image, image_bytes, field_name="image")

    normalized_fish = normalize_user_text(fish_species, field="plant_name")
    normalized_problem = normalize_user_text(problem, field="body")
    normalized_title = normalize_user_text(title, field="body") if title else None
    normalized_ai_health_status = normalize_user_text(ai_health_status, field="body")
    if not normalized_fish or not normalized_problem or not normalized_ai_health_status:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fish species and problem are required")

    digest = hashlib.sha256(image_bytes).hexdigest()
    persist_scan_image(image_sha256=digest, image_bytes=image_bytes)

    upload = MediaUpload(
        user_id=current_user.id,
        pond_id=None,
        file_type="image",
        file_path=digest,
        resolution="auto",
        is_community=True,
        title=normalized_title,
        post_text=normalized_problem
    )
    session.add(upload)
    await session.flush()

    analysis = AnalysisHistory(
        upload_id=upload.id,
        suitability_score=max(0.0, min(1.0, float(ai_confidence_score))),
        risk_level="high" if "healthy" not in normalized_ai_health_status.lower() else "low",
    )
    session.add(analysis)
    await session.flush()

    bio_health = BiologicalHealth(
        history_id=analysis.id,
        health_status=normalized_ai_health_status,
        disease_type=normalized_ai_health_status if "healthy" not in normalized_ai_health_status.lower() else None,
        confidence_score=float(ai_confidence_score),
    )
    session.add(bio_health)

    species_id = SpeciesIdentification(
        upload_id=upload.id,
        scientific_name=normalized_fish,
        confidence_score=max(0.0, min(1.0, float(ai_confidence_score)))
    )
    session.add(species_id)

    await session.commit()

    row = (await session.execute(_post_base_stmt(current_user.id).where(MediaUpload.id == upload.id))).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found after creation")
    return _serialize_post(row)


@router.get("/posts/{post_id}", response_model=CommunityPostDetailResponse)
async def get_post_details(
    post_id: str,
    comment_sort: str = Query(default="newest", pattern="^(newest|oldest)$"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommunityPostDetailResponse:
    stmt = _post_base_stmt(current_user.id).where(MediaUpload.id == post_id)
    row = (await session.execute(stmt)).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    comment_likes_subquery = (
        select(
            CommunityCommentLike.comment_id.label("comment_id"),
            func.count(CommunityCommentLike.id).label("likes_count"),
        )
        .group_by(CommunityCommentLike.comment_id)
        .subquery()
    )
    comment_liked_subquery = (
        select(CommunityCommentLike.comment_id.label("comment_id"))
        .where(CommunityCommentLike.user_id == current_user.id)
        .subquery()
    )
    comments_stmt = (
        select(CommunityComment, User.full_name.label("user_name"))
        .add_columns(
            User.role.label("user_role"),
            func.coalesce(comment_likes_subquery.c.likes_count, 0).label("likes_count"),
            case((comment_liked_subquery.c.comment_id.is_not(None), True), else_=False).label("liked_by_current_user"),
        )
        .join(User, User.id == CommunityComment.user_id)
        .outerjoin(comment_likes_subquery, comment_likes_subquery.c.comment_id == CommunityComment.id)
        .outerjoin(comment_liked_subquery, comment_liked_subquery.c.comment_id == CommunityComment.id)
        .where(CommunityComment.upload_id == post_id)
    )
    if comment_sort == "oldest":
        comments_stmt = comments_stmt.order_by(CommunityComment.created_at.asc())
    else:
        comments_stmt = comments_stmt.order_by(CommunityComment.created_at.desc())
    comments_result = await session.execute(comments_stmt)
    comments = [
        CommunityCommentResponse(
            id=comment.id,
            user_id=comment.user_id,
            user_name=user_name,
            user_role="farmer", # Hardcoded for now as user.role is an object now
            body=comment.body,
            parent_comment_id=comment.parent_comment_id,
            created_at=comment.created_at,
            is_owner=comment.user_id == current_user.id,
            is_expert=False, # Hardcoded for now
            likes_count=int(likes_count or 0),
            liked_by_current_user=bool(liked_by_current_user),
        )
        for comment, user_name, user_role, likes_count, liked_by_current_user in comments_result.all()
    ]

    post = _serialize_post(row)
    return CommunityPostDetailResponse(**post.model_dump(), comments=comments)


@router.post("/posts/{post_id}/like", response_model=CommunityPostResponse)
async def toggle_like(
    post_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommunityPostResponse:
    post_exists = await session.scalar(select(MediaUpload.id).where(MediaUpload.id == post_id))
    if post_exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    existing = await session.scalar(
        select(CommunityLike).where(
            CommunityLike.upload_id == post_id,
            CommunityLike.user_id == current_user.id,
        )
    )

    if existing is None:
        session.add(CommunityLike(upload_id=post_id, user_id=current_user.id))
        owner_id = await session.scalar(select(MediaUpload.user_id).where(MediaUpload.id == post_id))
        if owner_id:
            await create_notification(
                session=session,
                user_id=owner_id,
                actor_user_id=current_user.id,
                post_id=post_id,
                comment_id=None,
                kind="post_like",
                message=f"{current_user.full_name} liked your post.",
            )
    else:
        await session.execute(delete(CommunityLike).where(CommunityLike.id == existing.id))

    await session.commit()

    row = (await session.execute(_post_base_stmt(current_user.id).where(MediaUpload.id == post_id))).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return _serialize_post(row)


@router.post("/posts/{post_id}/comments", response_model=CommunityPostDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: str,
    payload: CommunityCommentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommunityPostDetailResponse:
    post_exists = await session.scalar(select(MediaUpload.id).where(MediaUpload.id == post_id))
    if post_exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    parent_comment_id = payload.parent_comment_id
    if parent_comment_id:
        parent_comment = await session.scalar(
            select(CommunityComment).where(
                CommunityComment.id == parent_comment_id,
                CommunityComment.upload_id == post_id,
            )
        )
        if parent_comment is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent comment not found")

    comment = CommunityComment(
        upload_id=post_id,
        user_id=current_user.id,
        parent_comment_id=parent_comment_id,
        body=payload.body.strip(),
    )
    session.add(comment)

    post_owner_id = await session.scalar(select(MediaUpload.user_id).where(MediaUpload.id == post_id))
    if post_owner_id:
        await create_notification(
            session=session,
            user_id=post_owner_id,
            actor_user_id=current_user.id,
            post_id=post_id,
            comment_id=None,
            kind="post_comment",
            message=f"{current_user.full_name} commented on your post.",
        )
    if parent_comment_id:
        parent_owner_id = await session.scalar(select(CommunityComment.user_id).where(CommunityComment.id == parent_comment_id))
        if parent_owner_id:
            await create_notification(
                session=session,
                user_id=parent_owner_id,
                actor_user_id=current_user.id,
                post_id=post_id,
                comment_id=parent_comment_id,
                kind="comment_reply",
                message=f"{current_user.full_name} replied to your comment.",
            )
    await session.commit()

    return await get_post_details(post_id=post_id, session=session, current_user=current_user)


@router.patch("/comments/{comment_id}", response_model=CommunityPostDetailResponse)
async def update_comment(
    comment_id: str,
    payload: CommunityCommentUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommunityPostDetailResponse:
    comment = await session.scalar(select(CommunityComment).where(CommunityComment.id == comment_id))
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own comment")

    comment.body = payload.body.strip()
    await session.commit()
    return await get_post_details(post_id=comment.upload_id, session=session, current_user=current_user)


@router.delete("/comments/{comment_id}", response_model=CommunityPostDetailResponse)
async def delete_comment(
    comment_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommunityPostDetailResponse:
    comment = await session.scalar(select(CommunityComment).where(CommunityComment.id == comment_id))
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own comment")

    post_id = comment.upload_id
    await session.delete(comment)
    await session.commit()
    return await get_post_details(post_id=post_id, session=session, current_user=current_user)


@router.post("/comments/{comment_id}/like", response_model=CommunityPostDetailResponse)
async def toggle_comment_like(
    comment_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommunityPostDetailResponse:
    comment = await session.scalar(select(CommunityComment).where(CommunityComment.id == comment_id))
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    existing = await session.scalar(
        select(CommunityCommentLike).where(
            CommunityCommentLike.comment_id == comment_id,
            CommunityCommentLike.user_id == current_user.id,
        )
    )
    if existing is None:
        session.add(CommunityCommentLike(comment_id=comment_id, user_id=current_user.id))
        await create_notification(
            session=session,
            user_id=comment.user_id,
            actor_user_id=current_user.id,
            post_id=comment.upload_id,
            comment_id=comment_id,
            kind="comment_like",
            message=f"{current_user.full_name} liked your comment.",
        )
    else:
        await session.execute(delete(CommunityCommentLike).where(CommunityCommentLike.id == existing.id))

    await session.commit()
    return await get_post_details(post_id=comment.upload_id, session=session, current_user=current_user)
