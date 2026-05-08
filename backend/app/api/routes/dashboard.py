from fastapi import APIRouter, Depends
from sqlalchemy import case, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_session
from app.models.media_upload import MediaUpload
from app.models.analysis_history import AnalysisHistory
from app.models.biological_health import BiologicalHealth
from app.models.species_identification import SpeciesIdentification
from app.models.user import User
from app.schemas.scan import AnalysisHistoryResponse, StatsResponse
from app.services.scan_image_store import load_scan_image_b64
from app.services.label_parser import parse_fish_label

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/history", response_model=list[AnalysisHistoryResponse])
async def history(
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[AnalysisHistoryResponse]:
    stmt = (
        select(AnalysisHistory, MediaUpload, BiologicalHealth, SpeciesIdentification)
        .join(MediaUpload, AnalysisHistory.upload_id == MediaUpload.id)
        .outerjoin(BiologicalHealth, AnalysisHistory.id == BiologicalHealth.history_id)
        .outerjoin(SpeciesIdentification, MediaUpload.id == SpeciesIdentification.upload_id)
        .where(MediaUpload.user_id == current_user.id)
        .order_by(desc(AnalysisHistory.analysis_date))
        .limit(limit)
    )
    result = await session.execute(stmt)
    rows = result.all()
    
    response = []
    for analysis, upload, bio_health, species_id in rows:
        health_status = bio_health.health_status if bio_health else "Unknown"
        fish_species = species_id.scientific_name if species_id else "Unknown"
        confidence_score = species_id.confidence_score if species_id else 0.0

        response.append(
            AnalysisHistoryResponse(
                id=analysis.id,
                health_status=health_status,
                fish_species=fish_species,
                disease=health_status,
                confidence_score=confidence_score,
                recommendation="",
                domain="color", # Mock domain
                created_at=analysis.analysis_date,
                before_image_b64=load_scan_image_b64(upload.file_path),
            )
        )
    return response


@router.get("/stats", response_model=StatsResponse)
async def stats(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> StatsResponse:
    # Total uploads
    total_stmt = select(func.count(MediaUpload.id)).where(MediaUpload.user_id == current_user.id)
    
    # Healthy ratio based on risk_level == 'low'
    healthy_stmt = select(
        func.avg(
            case(
                (AnalysisHistory.risk_level == "low", 1),
                else_=0,
            )
        )
    ).join(MediaUpload, AnalysisHistory.upload_id == MediaUpload.id).where(MediaUpload.user_id == current_user.id)
    
    # Top disease based on biological_health
    top_stmt = (
        select(BiologicalHealth.disease_type, func.count(BiologicalHealth.id).label("cnt"))
        .join(AnalysisHistory, BiologicalHealth.history_id == AnalysisHistory.id)
        .join(MediaUpload, AnalysisHistory.upload_id == MediaUpload.id)
        .where(MediaUpload.user_id == current_user.id)
        .where(BiologicalHealth.disease_type != "healthy")
        .where(BiologicalHealth.disease_type.is_not(None))
        .group_by(BiologicalHealth.disease_type)
        .order_by(desc("cnt"))
        .limit(1)
    )

    total = (await session.execute(total_stmt)).scalar_one() or 0
    healthy_ratio_raw = (await session.execute(healthy_stmt)).scalar_one()
    top_row = (await session.execute(top_stmt)).first()

    return StatsResponse(
        total_scans=int(total),
        healthy_ratio=float(healthy_ratio_raw or 0.0),
        top_disease=top_row[0] if top_row else None,
    )


@router.get("/tips", response_model=list[str])
async def tips() -> list[str]:
    return [
        "Monitor dissolved oxygen levels early in the morning.",
        "Check stocking density to avoid overcrowding stress.",
        "Inspect ponds for uneaten feed to prevent ammonia spikes.",
        "Observe fish behavior daily for signs of lethargy or gasping.",
    ]
