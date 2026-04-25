import uuid

import pytest
import pytest_asyncio
from collections.abc import AsyncGenerator
from httpx import ASGITransport, AsyncClient
from fastapi import FastAPI, Request, Response

from app.core.request_context import request_id as _request_id_ctx


def _make_app() -> FastAPI:
    """Minimal FastAPI app with the request-ID middleware for isolated testing."""
    test_app = FastAPI()

    @test_app.middleware("http")
    async def add_request_id(request: Request, call_next):
        rid = request.headers.get("x-request-id") or str(uuid.uuid4())
        _request_id_ctx.set(rid)
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response

    @test_app.get("/ping")
    async def ping():
        return {"request_id": _request_id_ctx.get("")}

    return test_app


@pytest_asyncio.fixture()
async def mw_client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(_make_app()), base_url="http://test"
    ) as cl:
        yield cl


@pytest.mark.asyncio
async def test_response_contains_generated_request_id(mw_client: AsyncClient) -> None:
    response = await mw_client.get("/ping")

    assert response.status_code == 200
    rid = response.headers.get("x-request-id")
    assert rid is not None
    assert len(rid) > 0
    # Should be a valid UUID4
    uuid.UUID(rid, version=4)


@pytest.mark.asyncio
async def test_provided_request_id_is_echoed(mw_client: AsyncClient) -> None:
    custom_id = "trace-test-abc-1234"
    response = await mw_client.get("/ping", headers={"X-Request-ID": custom_id})

    assert response.status_code == 200
    assert response.headers.get("x-request-id") == custom_id


@pytest.mark.asyncio
async def test_request_id_available_in_context(mw_client: AsyncClient) -> None:
    custom_id = "ctx-test-id-xyz"
    response = await mw_client.get("/ping", headers={"X-Request-ID": custom_id})

    body = response.json()
    assert body["request_id"] == custom_id
