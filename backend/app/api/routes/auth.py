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
from app.models.role import Role
from app.models.user import User
from app.models.team_invitation import TeamInvitation
from app.models.farm_member import FarmMember
from app.models.fish_farm import FishFarm
from app.models.email_verification import EmailVerification
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

    # Verify email code
    stmt = select(EmailVerification).where(
        EmailVerification.email == payload.email,
        EmailVerification.verification_code == payload.verification_code,
        EmailVerification.purpose == "signup",
        EmailVerification.used_at.is_(None)
    ).order_by(EmailVerification.created_at.desc())
    
    verification = (await session.execute(stmt)).scalars().first()
    
    if not verification:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")
        
    if verification.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired")

    # Resolve role and check invitation
    target_role_name = "Owner"
    invitation = None
    
    if payload.invite_token:
        # Check if invitation exists and is valid
        stmt = select(TeamInvitation).where(
            TeamInvitation.token == payload.invite_token,
            TeamInvitation.email == payload.email,
            TeamInvitation.status == "pending"
        )
        invitation = (await session.execute(stmt)).scalar_one_or_none()
        if not invitation:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired invitation token.")
        
        target_role_name = invitation.role

    role_stmt = select(Role).where(Role.role_name == target_role_name)
    role = (await session.execute(role_stmt)).scalar_one_or_none()
    
    if not role:
        role = Role(role_name=target_role_name, privileges={})
        session.add(role)
        await session.commit()
        await session.refresh(role)

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        role_id=role.id,
        hashed_password=get_password_hash(payload.password),
    )
    session.add(user)
    await session.flush()  # Ensure user.id is populated before referencing it
    
    # If invited, associate the user with the farm
    if invitation:
        invitation.status = "accepted"
        farm_member = FarmMember(
            farm_id=invitation.farm_id,
            user_id=user.id,
            role=invitation.role
        )
        session.add(farm_member)
    elif target_role_name == "Owner":
        # Auto-create a default farm for new owners
        farm = FishFarm(
            user_id=user.id,
            farm_name=f"{payload.full_name}'s Farm"
        )
        session.add(farm)

    # Mark code as used
    verification.used_at = datetime.now(timezone.utc)

    await session.commit()
    await session.refresh(user)
    audit_event(event="auth.signup", outcome="success", request=request, user_id=user.id, email=user.email)

    # Send welcome email (fire-and-forget, non-critical)
    try:
        await send_welcome_email(user.email, user.full_name)
    except Exception:
        pass

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


import random
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.models.email_verification import EmailVerification
from app.services.email import send_verification_email, send_welcome_email
from app.schemas.auth import (
    EmailVerificationRequest, EmailVerificationConfirm, ResetPasswordRequest,
    GoogleAuthRequest, GoogleCheckRequest, GoogleCheckResponse, InvitationInfoResponse,
)

@router.post("/request-verification")
async def request_verification(
    payload: EmailVerificationRequest,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    await enforce_rate_limit(request=request, scope="auth_verify", limit=5, window_seconds=60)
    
    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    verification = EmailVerification(
        email=payload.email,
        verification_code=code,
        purpose=payload.purpose,
        expires_at=expires_at
    )
    session.add(verification)
    await session.commit()
    
    try:
        await send_verification_email(payload.email, code, payload.purpose)
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send verification email.")
        
    return {"status": "ok", "message": "Verification email sent"}

@router.post("/verify-email")
async def verify_email(
    payload: EmailVerificationConfirm,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    await enforce_rate_limit(request=request, scope="auth_verify_confirm", limit=10, window_seconds=60)
    
    stmt = select(EmailVerification).where(
        EmailVerification.email == payload.email,
        EmailVerification.verification_code == payload.code,
        EmailVerification.purpose == payload.purpose,
        EmailVerification.used_at.is_(None)
    ).order_by(EmailVerification.created_at.desc())
    
    verification = (await session.execute(stmt)).scalars().first()
    
    if not verification:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")
        
    if verification.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired")
        
    verification.used_at = datetime.now(timezone.utc)
    await session.commit()
    return {"status": "ok"}

@router.get("/invitation/{token}", response_model=InvitationInfoResponse)
async def get_invitation_info(
    token: str,
    session: AsyncSession = Depends(get_session)
):
    """Look up a pending invitation by token. Returns email, farm name, role."""
    from sqlalchemy.orm import selectinload
    stmt = select(TeamInvitation).where(
        TeamInvitation.token == token,
        TeamInvitation.status == "pending"
    ).options(selectinload(TeamInvitation.farm), selectinload(TeamInvitation.inviter))

    invitation = (await session.execute(stmt)).scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found or expired")

    if invitation.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        invitation.status = "expired"
        await session.commit()
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invitation has expired")

    return InvitationInfoResponse(
        email=invitation.email,
        farm_name=invitation.farm.farm_name if invitation.farm else "Unknown Farm",
        role=invitation.role,
        inviter_name=invitation.inviter.full_name if invitation.inviter else "Someone",
    )

@router.post("/google/check", response_model=GoogleCheckResponse)
async def google_check(
    payload: GoogleCheckRequest,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """Check if a Google user already exists. Does NOT create an account."""
    if not settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Google Auth is not configured")

    try:
        idinfo = id_token.verify_oauth2_token(
            payload.token, google_requests.Request(), settings.google_client_id
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    email = idinfo.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email not provided by Google")

    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()

    if user:
        return GoogleCheckResponse(exists=True, email=email, name=idinfo.get("name"))
    else:
        return GoogleCheckResponse(exists=False, email=email, name=idinfo.get("name"))

@router.post("/forgot-password")
async def forgot_password(
    payload: EmailVerificationRequest,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    user = (await session.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
        
    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    verification = EmailVerification(
        email=payload.email,
        verification_code=code,
        purpose="reset_password",
        expires_at=expires_at
    )
    session.add(verification)
    await session.commit()
    
    try:
        await send_verification_email(payload.email, code, "reset_password")
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send reset email.")
        
    return {"status": "ok", "message": "Code sent successfully."}

@router.post("/verify-reset-code")
async def verify_reset_code(
    payload: EmailVerificationConfirm,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    await enforce_rate_limit(request=request, scope="auth_verify_reset", limit=10, window_seconds=60)
    
    stmt = select(EmailVerification).where(
        EmailVerification.email == payload.email,
        EmailVerification.verification_code == payload.code,
        EmailVerification.purpose == "reset_password",
        EmailVerification.used_at.is_(None)
    ).order_by(EmailVerification.created_at.desc())
    
    verification = (await session.execute(stmt)).scalars().first()
    
    if not verification:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")
        
    if verification.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired")
        
    # We do not mark it as used yet. We just confirm it's valid.
    return {"status": "ok"}

@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    stmt = select(EmailVerification).where(
        EmailVerification.email == payload.email,
        EmailVerification.verification_code == payload.code,
        EmailVerification.purpose == "reset_password",
        EmailVerification.used_at.is_(None)
    ).order_by(EmailVerification.created_at.desc())
    
    verification = (await session.execute(stmt)).scalars().first()
    
    if not verification:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset code")
        
    if verification.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset code expired")
        
    user = (await session.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    user.hashed_password = get_password_hash(payload.new_password)
    verification.used_at = datetime.now(timezone.utc)
    
    await _invalidate_all_user_sessions(session, user.id)
    await session.commit()
    return {"status": "ok"}

@router.post("/google", response_model=TokenResponse)
async def google_auth(
    payload: GoogleAuthRequest,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    if not settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Google Auth is not configured")
        
    try:
        idinfo = id_token.verify_oauth2_token(
            payload.token, google_requests.Request(), settings.google_client_id
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")
        
    email = idinfo.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email not provided by Google")
        
    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    
    if not user:
        # Resolve role and check invitation
        target_role_name = "Owner"
        invitation = None
        
        if payload.invite_token:
            stmt = select(TeamInvitation).where(
                TeamInvitation.token == payload.invite_token,
                TeamInvitation.email == email,
                TeamInvitation.status == "pending"
            )
            invitation = (await session.execute(stmt)).scalar_one_or_none()
            if not invitation:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired invitation token.")
            
            target_role_name = invitation.role

        role_stmt = select(Role).where(Role.role_name == target_role_name)
        role = (await session.execute(role_stmt)).scalar_one_or_none()
        
        if not role:
            role = Role(role_name=target_role_name, privileges={})
            session.add(role)
            await session.commit()
            await session.refresh(role)

        user = User(
            email=email,
            full_name=payload.full_name or idinfo.get("name", "Google User"),
            role_id=role.id,
            hashed_password=get_password_hash(payload.password if payload.password else f"google_{uuid4()}"),
        )
        session.add(user)
        await session.flush()  # Ensure user.id is populated before referencing it
        
        if invitation:
            invitation.status = "accepted"
            farm_member = FarmMember(
                farm_id=invitation.farm_id,
                user_id=user.id,
                role=invitation.role
            )
            session.add(farm_member)
        elif target_role_name == "Owner":
            # Auto-create a default farm for new owners
            farm = FishFarm(
                user_id=user.id,
                farm_name=f"{idinfo.get('name', 'My')}'s Farm"
            )
            session.add(farm)
            
        await session.commit()
        await session.refresh(user)

        # Send welcome email (fire-and-forget, non-critical)
        try:
            await send_welcome_email(user.email, user.full_name)
        except Exception:
            pass
        
    audit_event(event="auth.google_login", outcome="success", request=request, user_id=user.id, email=user.email)
    return await _issue_token_pair(session, user.id)
