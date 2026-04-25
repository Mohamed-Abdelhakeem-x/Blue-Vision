from fastapi import APIRouter, Depends
from sqlalchemy import case, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_session
from app.models.scan_history import ScanHistory
from app.models.user import User
from app.schemas.scan import ScanHistoryResponse, StatsResponse
from app.services.scan_image_store import load_scan_image_b64
from app.services.label_parser import parse_disease_label

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/history", response_model=list[ScanHistoryResponse])
async def history(
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[ScanHistoryResponse]:
    stmt = (
        select(ScanHistory)
        .where(ScanHistory.user_id == current_user.id, ScanHistory.entry_kind == "scan")
        .order_by(desc(ScanHistory.created_at))
        .limit(limit)
    )
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [
        ScanHistoryResponse(
            id=row.id,
            disease_type=row.disease_type,
            plant_name=parse_disease_label(row.disease_type)[0],
            disease=parse_disease_label(row.disease_type)[1],
            confidence_score=row.confidence_score,
            recommendation=row.recommendation,
            domain=row.domain,
            created_at=row.created_at,
            before_image_b64=load_scan_image_b64(row.image_sha256),
        )
        for row in rows
    ]


@router.get("/stats", response_model=StatsResponse)
async def stats(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> StatsResponse:
    total_stmt = select(func.count(ScanHistory.id)).where(ScanHistory.user_id == current_user.id)
    healthy_stmt = select(
        func.avg(
            case(
                (ScanHistory.disease_type.ilike("%healthy%"), 1),
                else_=0,
            )
        )
    ).where(ScanHistory.user_id == current_user.id, ScanHistory.entry_kind == "scan")
    top_stmt = (
        select(ScanHistory.disease_type, func.count(ScanHistory.id).label("cnt"))
        .where(ScanHistory.user_id == current_user.id, ScanHistory.entry_kind == "scan")
        .group_by(ScanHistory.disease_type)
        .order_by(desc("cnt"))
        .limit(1)
    )
    total_stmt = total_stmt.where(ScanHistory.entry_kind == "scan")

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
        "Water in the morning to reduce prolonged plant moisture.",
        "Rotate plant seasonally to reduce disease carryover.",
        "Prune dense foliage to improve airflow around leaves.",
        "Inspect plant undersides weekly for early signs of pests.",
    ]
