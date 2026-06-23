from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.db.session import get_session
from app.models.user import User
from app.models.pond import Pond
from app.models.fish_farm import FishFarm
from app.models.farm_member import FarmMember
from app.models.environmental_data import EnvironmentalData
from app.schemas.pond import PondCreate, PondUpdate, PondResponse

router = APIRouter(prefix="/ponds", tags=["ponds"])

async def get_user_farm_id(user: User, session: AsyncSession) -> str:
    """
    Helper to resolve the farm_id for the current user based on their role.
    Owners own the farm directly, while Farm Managers are farm members.
    """
    role_name = user.role.role_name if user.role else ""
    
    if role_name == "Owner":
        farm = (await session.execute(
            select(FishFarm).where(FishFarm.user_id == user.id)
        )).scalar_one_or_none()
        if not farm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No farm found for this Owner."
            )
        return farm.id
        
    elif role_name == "Farm Manager":
        member = (await session.execute(
            select(FarmMember).where(FarmMember.user_id == user.id)
        )).scalar_one_or_none()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Farm Manager does not belong to any farm."
            )
        return member.farm_id
        
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this role."
        )

@router.post("", response_model=PondResponse, status_code=status.HTTP_201_CREATED)
async def create_pond(
    payload: PondCreate,
    current_user: User = Depends(require_roles("Farm Manager")),
    session: AsyncSession = Depends(get_session)
):
    farm_id = await get_user_farm_id(current_user, session)
    
    pond = Pond(
        farm_id=farm_id,
        type=payload.type.value,
        size_sq_meters=payload.size_sq_meters,
        stocking_density=payload.stocking_density
    )
    session.add(pond)
    await session.commit()
    await session.refresh(pond)
    
    # Bootstrap initial environmental sensor telemetry data for this pond
    initial_telemetry = EnvironmentalData(
        pond_id=pond.id,
        dissolved_oxygen=6.2,  # Optimal (DO > 5.0)
        temperature=26.5,      # Optimal (24 - 30)
        ph_level=7.4           # Optimal (6.5 - 8.5)
    )
    session.add(initial_telemetry)
    await session.commit()
    
    return pond

@router.get("", response_model=List[PondResponse])
async def list_ponds(
    current_user: User = Depends(require_roles("Owner", "Farm Manager")),
    session: AsyncSession = Depends(get_session)
):
    farm_id = await get_user_farm_id(current_user, session)
    
    result = await session.execute(
        select(Pond).where(Pond.farm_id == farm_id)
    )
    return result.scalars().all()

@router.get("/{pond_id}", response_model=PondResponse)
async def get_pond(
    pond_id: str,
    current_user: User = Depends(require_roles("Owner", "Farm Manager")),
    session: AsyncSession = Depends(get_session)
):
    farm_id = await get_user_farm_id(current_user, session)
    
    pond = (await session.execute(
        select(Pond).where(Pond.id == pond_id, Pond.farm_id == farm_id)
    )).scalar_one_or_none()
    
    if not pond:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pond not found or access denied."
        )
    return pond

@router.put("/{pond_id}", response_model=PondResponse)
async def update_pond(
    pond_id: str,
    payload: PondUpdate,
    current_user: User = Depends(require_roles("Farm Manager")),
    session: AsyncSession = Depends(get_session)
):
    farm_id = await get_user_farm_id(current_user, session)
    
    pond = (await session.execute(
        select(Pond).where(Pond.id == pond_id, Pond.farm_id == farm_id)
    )).scalar_one_or_none()
    
    if not pond:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pond not found or access denied."
        )
        
    if payload.type is not None:
        pond.type = payload.type.value
    if payload.size_sq_meters is not None:
        pond.size_sq_meters = payload.size_sq_meters
    if payload.stocking_density is not None:
        pond.stocking_density = payload.stocking_density
        
    await session.commit()
    await session.refresh(pond)
    return pond

@router.delete("/{pond_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pond(
    pond_id: str,
    current_user: User = Depends(require_roles("Farm Manager")),
    session: AsyncSession = Depends(get_session)
):
    farm_id = await get_user_farm_id(current_user, session)
    
    pond = (await session.execute(
        select(Pond).where(Pond.id == pond_id, Pond.farm_id == farm_id)
    )).scalar_one_or_none()
    
    if not pond:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pond not found or access denied."
        )
        
    await session.delete(pond)
    await session.commit()
    return
