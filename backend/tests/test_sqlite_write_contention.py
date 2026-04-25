import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import event, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.db.session import apply_sqlite_pragmas
from app.models.scan_history import ScanHistory
from app.models.user import User


@dataclass
class _StressSettings:
    sqlite_journal_mode: str = "WAL"
    sqlite_synchronous: str = "NORMAL"
    sqlite_busy_timeout_ms: int = 5000
    sqlite_foreign_keys: bool = True


@pytest.mark.asyncio
async def test_sqlite_concurrent_writes_avoid_lock_failures(tmp_path):
    db_path = tmp_path / "contention.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", future=True)

    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, _connection_record) -> None:
        apply_sqlite_pragmas(dbapi_connection, settings_obj=_StressSettings())

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        user = User(email="stress@example.com", full_name="Stress User", hashed_password="hashed", role="farmer")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        user_id = user.id

    async def _write_scan(idx: int):
        async with session_factory() as session:
            session.add(
                ScanHistory(
                    user_id=user_id,
                    disease_type="Tomato___healthy",
                    confidence_score=0.95,
                    recommendation="No action needed",
                    domain="color",
                    image_sha256=f"{idx:064x}",
                    created_at=datetime.now(UTC),
                    id=str(uuid4()),
                )
            )
            await session.commit()

    write_count = 120
    results = await asyncio.gather(*(_write_scan(i) for i in range(write_count)), return_exceptions=True)
    errors = [result for result in results if isinstance(result, Exception)]

    assert not errors, f"Expected no write contention errors, got: {errors[:3]}"

    async with session_factory() as session:
        total = await session.scalar(select(func.count()).select_from(ScanHistory))
    assert total == write_count

    await engine.dispose()
