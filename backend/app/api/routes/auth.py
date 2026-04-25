from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import audit_event
from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_password_hash,
    token_fingerprint,
    verify_password,
)
from app.db.session import get_session
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshTokenRequest, SignUpRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.rate_limiter import enforce_rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


async def _issue_token_pair(session: AsyncSession, user_id: str) -> TokenResponse:
    access_token = create_access_token(user_id)
    token_id = str(uuid4())
    refresh_token = create_refresh_token(user_id, token_id=token_id)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)

    session.add(
        RefreshToken(
            id=token_id,
            user_id=user_id,
            token_hash=token_fingerprint(refresh_token),
            expires_at=expires_at,
        )
    )
    await session.commit()
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


async def _invalidate_all_user_sessions(session: AsyncSession, user_id: str) -> None:
    now = datetime.now(timezone.utc)
    stmt = (
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    await session.execute(stmt)
    await session.commit()


@router.post("/signup", response_model=UserResponse)
async def signup(
    payload: SignUpRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    await enforce_rate_limit(
        request=request,
        scope="auth_signup",
        limit=settings.rate_limit_signup_per_minute,
        window_seconds=60,
    )

    result = await session.execute(select(User).where(User.email == payload.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        audit_event(
            event="auth.signup",
            outcome="denied",
            request=request,
            email=payload.email,
            reason="email_already_registered",
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        role="farmer",
        hashed_password=get_password_hash(payload.password),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    audit_event(event="auth.signup", outcome="success", request=request, user_id=user.id, email=user.email)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    await enforce_rate_limit(
        request=request,
        scope="auth_login",
        limit=settings.rate_limit_login_per_minute,
        window_seconds=60,
    )

    result = await session.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        audit_event(
            event="auth.login",
            outcome="denied",
            request=request,
            email=payload.email,
            reason="invalid_credentials",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    audit_event(event="auth.login", outcome="success", request=request, user_id=user.id, email=user.email)
    return await _issue_token_pair(session, user.id)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    payload: RefreshTokenRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    token_payload = decode_refresh_token(payload.refresh_token)
    if not token_payload or "sub" not in token_payload or "jti" not in token_payload:
        audit_event(event="auth.refresh", outcome="denied", request=request, reason="invalid_token_payload")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    token_hash = token_fingerprint(payload.refresh_token)
    token_stmt = select(RefreshToken).where(RefreshToken.id == token_payload["jti"])
    token_record = (await session.execute(token_stmt)).scalar_one_or_none()
    if token_record is None or token_record.user_id != token_payload["sub"]:
        audit_event(
            event="auth.refresh",
            outcome="denied",
            request=request,
            user_id=token_payload.get("sub"),
            reason="token_not_recognized",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not recognized")

    if token_record.token_hash != token_hash:
        await _invalidate_all_user_sessions(session, token_record.user_id)
        audit_event(
            event="auth.refresh",
            outcome="denied",
            request=request,
            user_id=token_record.user_id,
            reason="token_reuse_detected_hash_mismatch",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token reuse detected")

    now = datetime.now(timezone.utc)
    expires_at = token_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if token_record.revoked_at is not None:
        await _invalidate_all_user_sessions(session, token_record.user_id)
        audit_event(
            event="auth.refresh",
            outcome="denied",
            request=request,
            user_id=token_record.user_id,
            reason="token_reuse_detected_revoked",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token reuse detected")

    if expires_at <= now:
        audit_event(
            event="auth.refresh",
            outcome="denied",
            request=request,
            user_id=token_record.user_id,
            reason="token_expired",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired or revoked")

    token_record.revoked_at = now
    await session.flush()
    audit_event(event="auth.refresh", outcome="success", request=request, user_id=token_record.user_id)
    return await _issue_token_pair(session, token_payload["sub"])


@router.post("/logout")
async def logout(
    payload: RefreshTokenRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    decoded = decode_refresh_token(payload.refresh_token)
    token_hash = token_fingerprint(payload.refresh_token)

    if decoded and "jti" in decoded:
        token_stmt = select(RefreshToken).where(RefreshToken.id == decoded["jti"])
    else:
        token_stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)

    token_record = (await session.execute(token_stmt)).scalar_one_or_none()
    if token_record and token_record.token_hash == token_hash and token_record.revoked_at is None:
        token_record.revoked_at = datetime.now(timezone.utc)
        await session.commit()
        audit_event(event="auth.logout", outcome="success", request=request, user_id=token_record.user_id)
    else:
        audit_event(event="auth.logout", outcome="denied", request=request, reason="token_not_active")
    return {"status": "ok"}
