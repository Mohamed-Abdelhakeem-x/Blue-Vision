import pytest
import pytest_asyncio
from collections.abc import AsyncGenerator
from fastapi import FastAPI, Response
from httpx import ASGITransport, AsyncClient

from app.services.metrics import (
    begin_timer,
    clear_metrics_store,
    record_request_metric,
    render_metrics_snapshot,
    render_prometheus_metrics,
    render_slo_snapshot,
)


@pytest_asyncio.fixture()
async def metrics_client() -> AsyncGenerator[AsyncClient, None]:
    clear_metrics_store()
    app = FastAPI()

    @app.middleware("http")
    async def collect_request_metrics(request, call_next):
        start_time = begin_timer()
        response: Response = await call_next(request)
        if request.url.path not in {"/metrics", "/metrics/prometheus", "/slo"}:
            record_request_metric(route=request.url.path, status_code=response.status_code, start_time=start_time)
        return response

    @app.get("/ok")
    async def ok() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/boom")
    async def boom() -> Response:
        return Response(status_code=500)

    @app.get("/metrics")
    async def metrics():
        return render_metrics_snapshot()

    @app.get("/slo")
    async def slo():
        return render_slo_snapshot(min_requests_for_evaluation=5)

    @app.get("/metrics/prometheus")
    async def metrics_prometheus() -> Response:
        return Response(
            content=render_prometheus_metrics(),
            media_type="text/plain; version=0.0.4",
        )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.mark.asyncio
async def test_metrics_counts_and_latency(metrics_client: AsyncClient) -> None:
    await metrics_client.get("/ok")
    await metrics_client.get("/ok")
    await metrics_client.get("/boom")

    metrics_res = await metrics_client.get("/metrics")
    payload = metrics_res.json()

    assert "/ok" in payload
    assert payload["/ok"]["requests_total"] == 2
    assert payload["/ok"]["errors_total"] == 0
    assert payload["/ok"]["latency_seconds_sum"] >= 0

    assert "/boom" in payload
    assert payload["/boom"]["requests_total"] == 1
    assert payload["/boom"]["errors_total"] == 1


@pytest.mark.asyncio
async def test_metrics_endpoint_is_not_self_counted(metrics_client: AsyncClient) -> None:
    await metrics_client.get("/metrics")
    await metrics_client.get("/slo")
    await metrics_client.get("/metrics/prometheus")
    payload = (await metrics_client.get("/metrics")).json()

    assert "/metrics" not in payload
    assert "/slo" not in payload
    assert "/metrics/prometheus" not in payload


@pytest.mark.asyncio
async def test_slo_endpoint_computes_error_rate_and_status(metrics_client: AsyncClient) -> None:
    for _ in range(9):
        ok_res = await metrics_client.get("/ok")
        assert ok_res.status_code == 200

    fail_res = await metrics_client.get("/boom")
    assert fail_res.status_code == 500

    slo_res = await metrics_client.get("/slo")
    assert slo_res.status_code == 200

    payload = slo_res.json()
    assert payload["requests_total"] == 10
    assert payload["errors_total"] == 1
    assert payload["availability"] == 0.9
    assert payload["error_rate"] == 0.1
    assert payload["availability_ok"] is False
    assert payload["error_budget_ok"] is False
    assert payload["slo_ok"] is False
    assert payload["enough_data"] is True
    assert payload["enforceable_slo_ok"] is False
    assert payload["error_budget_target"] == 0.01
    assert payload["error_budget_remaining"] == 0.0
    assert payload["error_budget_burn_rate"] == 10.0
    assert payload["policy_status"] == "breach"


@pytest.mark.asyncio
async def test_slo_endpoint_not_enforced_when_insufficient_volume(metrics_client: AsyncClient) -> None:
    for _ in range(3):
        ok_res = await metrics_client.get("/ok")
        assert ok_res.status_code == 200

    fail_res = await metrics_client.get("/boom")
    assert fail_res.status_code == 500

    slo_res = await metrics_client.get("/slo")
    payload = slo_res.json()
    assert payload["requests_total"] == 4
    assert payload["enough_data"] is False
    assert payload["slo_ok"] is False
    assert payload["enforceable_slo_ok"] is True
    assert payload["policy_status"] == "insufficient_data"


@pytest.mark.asyncio
async def test_slo_endpoint_healthy_policy_when_within_budget(metrics_client: AsyncClient) -> None:
    for _ in range(8):
        ok_res = await metrics_client.get("/ok")
        assert ok_res.status_code == 200

    slo_res = await metrics_client.get("/slo")
    payload = slo_res.json()

    assert payload["requests_total"] == 8
    assert payload["errors_total"] == 0
    assert payload["enough_data"] is True
    assert payload["slo_ok"] is True
    assert payload["enforceable_slo_ok"] is True
    assert payload["error_budget_ok"] is True
    assert payload["error_budget_burn_rate"] == 0.0
    assert payload["policy_status"] == "healthy"


@pytest.mark.asyncio
async def test_prometheus_endpoint_contains_route_metrics(metrics_client: AsyncClient) -> None:
    ok_res = await metrics_client.get("/ok")
    assert ok_res.status_code == 200

    prom_res = await metrics_client.get("/metrics/prometheus")
    assert prom_res.status_code == 200
    assert prom_res.headers["content-type"].startswith("text/plain")

    body = prom_res.text
    assert "# HELP bluevision_http_requests_total" in body
    assert 'bluevision_http_requests_total{route="/ok"} 1' in body
