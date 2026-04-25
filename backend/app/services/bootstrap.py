import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plant_metadata import PlantMetadata
from app.services.recommendations import recommendation_for_label


async def seed_metadata_if_empty(session: AsyncSession, labels_path: str) -> None:
    existing = await session.execute(select(PlantMetadata).limit(1))
    if existing.scalar_one_or_none() is not None:
        return

    path = Path(labels_path)
    if not path.exists():
        return

    labels = json.loads(path.read_text(encoding="utf-8"))
    records = [
        PlantMetadata(
            disease_type=label,
            plant_family=label.split("___")[0] if "___" in label else "unknown",
            treatment_recommendation=recommendation_for_label(label),
            severity_hint="low" if "healthy" in label.lower() else "medium",
        )
        for label in labels
    ]
    session.add_all(records)
    await session.commit()
