import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.routes import auth, dashboard, detection, social, users
from app.db.base import Base
from app.db.session import get_session
from app.services.rate_limiter import clear_rate_limit_state


class FakeAIService:
    def predict(self, image_bytes: bytes) -> dict[str, float | str | int]:
        return {
            "index": 0,
            "label": "Tomato___healthy",
            "confidence": 0.99,
        }


@pytest.fixture(autouse=True)
def reset_rate_limit_state() -> None:
    clear_rate_limit_state()


@pytest_asyncio.fixture()
async def client(tmp_path: pytest.TempPathFactory) -> AsyncGenerator[AsyncClient, None]:
    db_path = tmp_path / "integration.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", future=True)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app = FastAPI()
    app.include_router(auth.router, prefix="/api")
    app.include_router(users.router, prefix="/api")
    app.include_router(detection.router, prefix="/api")
    app.include_router(dashboard.router, prefix="/api")
    app.include_router(social.router, prefix="/api")
    app.dependency_overrides[get_session] = override_get_session

    detection.router.ai_service = FakeAIService()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client

    await engine.dispose()
