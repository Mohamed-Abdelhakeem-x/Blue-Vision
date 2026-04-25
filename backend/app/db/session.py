from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.sqlite_url, echo=False, future=True)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


def apply_sqlite_pragmas(dbapi_connection, *, settings_obj) -> None:
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute(f"PRAGMA journal_mode={settings_obj.sqlite_journal_mode.strip().upper()}")
        cursor.execute(f"PRAGMA synchronous={settings_obj.sqlite_synchronous.strip().upper()}")
        cursor.execute(f"PRAGMA busy_timeout={int(settings_obj.sqlite_busy_timeout_ms)}")
        cursor.execute(f"PRAGMA foreign_keys={1 if settings_obj.sqlite_foreign_keys else 0}")
    finally:
        cursor.close()


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:
    apply_sqlite_pragmas(dbapi_connection, settings_obj=settings)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
