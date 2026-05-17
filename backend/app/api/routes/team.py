import secrets
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_roles
from app.core.audit import audit_event
from app.db.session import get_session
from app.models.farm_member import FarmMember
from app.models.fish_farm import FishFarm
from app.models.team_invitation import TeamInvitation
from app.models.user import User
from app.schemas.team import FarmMemberResponse, InviteMemberRequest, TeamInvitationResponse
from app.services.email import send_team_invitation_email

router = APIRouter(prefix="/team", tags=["team"])

@router.post("/invite", response_model=TeamInvitationResponse)
async def invite_member(
    payload: InviteMemberRequest,
    request: Request,
    current_user: User = Depends(require_roles("Owner")),
    session: AsyncSession = Depends(get_session)
):
    # Get the owner's farm
    farm = (await session.execute(
        select(FishFarm).where(FishFarm.user_id == current_user.id)
    )).scalar_one_or_none()
    
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No farm found for the current owner.")
        
    # Check if the user is already a member
    existing_user = (await session.execute(
        select(User).where(User.email == payload.email)
    )).scalar_one_or_none()
    
    if existing_user:
        existing_member = (await session.execute(
            select(FarmMember).where(
                FarmMember.farm_id == farm.id,
                FarmMember.user_id == existing_user.id
            )
        )).scalar_one_or_none()
        
        if existing_member:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member of this farm.")
            
    # Check if a pending invite already exists
    existing_invite = (await session.execute(
        select(TeamInvitation).where(
            TeamInvitation.farm_id == farm.id,
            TeamInvitation.email == payload.email,
            TeamInvitation.status == "pending"
        )
    )).scalar_one_or_none()
    
    if existing_invite:
        if existing_invite.expires_at.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A pending invitation already exists for this email.")
            
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    invitation = TeamInvitation(
        farm_id=farm.id,
        inviter_id=current_user.id,
        email=payload.email,
        token=token,
        role=payload.role,
        expires_at=expires_at
    )
    
    session.add(invitation)
    await session.commit()
    await session.refresh(invitation)
    
    # Send email
    try:
        await send_team_invitation_email(
            to_email=payload.email,
            token=token,
            inviter_name=current_user.full_name,
            farm_name=farm.farm_name,
            role=payload.role
        )
    except Exception:
        # We don't rollback the invite, but we could. For now, just let it exist.
        pass
        
    audit_event(
        event="team.invite",
        outcome="success",
        request=request,
        user_id=current_user.id,
        target_email=payload.email
    )
    
    return TeamInvitationResponse(
        id=invitation.id,
        email=invitation.email,
        role=invitation.role,
        status=invitation.status,
        created_at=invitation.created_at,
        expires_at=invitation.expires_at
    )

@router.get("/members", response_model=List[FarmMemberResponse])
async def list_members(
    current_user: User = Depends(require_roles("Owner")),
    session: AsyncSession = Depends(get_session)
):
    farm = (await session.execute(
        select(FishFarm).where(FishFarm.user_id == current_user.id)
    )).scalar_one_or_none()
    
    if not farm:
        return []
        
    members = (await session.execute(
        select(FarmMember)
        .options(selectinload(FarmMember.user))
        .where(FarmMember.farm_id == farm.id)
    )).scalars().all()
    
    return [
        FarmMemberResponse(
            id=m.id,
            user_id=m.user_id,
            email=m.user.email,
            full_name=m.user.full_name,
            role=m.role,
            joined_at=m.created_at
        ) for m in members
    ]

@router.delete("/members/{member_id}")
async def remove_member(
    member_id: str,
    request: Request,
    current_user: User = Depends(require_roles("Owner")),
    session: AsyncSession = Depends(get_session)
):
    farm = (await session.execute(
        select(FishFarm).where(FishFarm.user_id == current_user.id)
    )).scalar_one_or_none()
    
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No farm found.")
        
    member = (await session.execute(
        select(FarmMember).where(
            FarmMember.id == member_id,
            FarmMember.farm_id == farm.id
        )
    )).scalar_one_or_none()
    
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")
        
    # Also optionally delete the user's sessions or change their role?
    # For now, just removing them from the farm is enough. Next time they log in, they have no farm access.
    
    await session.delete(member)
    await session.commit()
    
    audit_event(
        event="team.remove_member",
        outcome="success",
        request=request,
        user_id=current_user.id,
        target_member_id=member_id
    )
    
    return {"status": "ok", "message": "Member removed successfully."}
