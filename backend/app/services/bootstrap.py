import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.recommendations import recommendation_for_label

async def seed_metadata_if_empty(session: AsyncSession, labels_path: str) -> None:
    # No longer needed for fish pivot without a dedicated metadata table
    return
