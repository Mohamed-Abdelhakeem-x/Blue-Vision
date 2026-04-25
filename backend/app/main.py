import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi import Request, Response
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routes import auth, chat, community, dashboard, detection, notifications, social, users
from app.core.config import get_settings
from app.core.logging_config import configure_logging
from app.core.request_context import request_id as _request_id_ctx
from app.db.session import SessionLocal
from app.services.ai_service import AIService
from app.services.bootstrap import seed_metadata_if_empty
from app.services.metrics import (
    begin_timer,
    record_request_metric,
    render_metrics_snapshot,
    render_prometheus_metrics,
    render_slo_snapshot,
)

settings = get_settings()
configure_logging()


def build_security_headers(*, app_env: str) -> dict[str, str]:
    headers = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-site",
        "Content-Security-Policy": settings.security_csp,
    }

    if app_env.strip().lower() in {"production", "prod"}:
        headers["Strict-Transport-Security"] = (
            f"max-age={settings.security_hsts_max_age_seconds}; includeSubDomains; preload"
        )

    return headers


@asynccontextmanager
async def lifespan(app: FastAPI):
    model_path = Path(settings.model_path)
    labels_path = Path(settings.labels_path)
    if not model_path.exists() or not labels_path.exists():
        try:
            from scripts.export_onnx import export as export_onnx
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "Model artifacts are missing and ONNX export dependencies are unavailable. "
                "Install torch/torchvision or provide prebuilt model artifacts."
            ) from exc

        export_onnx(settings.checkpoint_path)

    ai_service = AIService(model_path=settings.model_path, labels_path=settings.labels_path)
    app.state.ai_service = ai_service
    detection.router.ai_service = ai_service

    async with SessionLocal() as session:
        await seed_metadata_if_empty(session, settings.labels_path)

    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=settings.cors_allow_method_list,
    allow_headers=settings.cors_allow_header_list,
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    for key, value in build_security_headers(app_env=settings.app_env).items():
        response.headers[key] = value
    return response


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    rid = request.headers.get("x-request-id") or str(uuid.uuid4())
    _request_id_ctx.set(rid)
    response: Response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response


@app.middleware("http")
async def collect_request_metrics(request: Request, call_next):
    start_time = begin_timer()
    response: Response = await call_next(request)
    route_key = request.url.path
    if route_key not in {"/metrics", "/metrics/prometheus", "/slo"}:
        record_request_metric(route=route_key, status_code=response.status_code, start_time=start_time)
    return response


app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(detection.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(community.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(social.router, prefix="/api")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
async def ready() -> dict[str, str]:
    model_path = Path(settings.model_path)
    labels_path = Path(settings.labels_path)

    if not model_path.exists() or not labels_path.exists():
        raise HTTPException(status_code=503, detail="Model artifacts are not ready")

    if not hasattr(detection.router, "ai_service"):
        raise HTTPException(status_code=503, detail="AI service is not initialized")

    try:
        async with SessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database is not ready: {exc}") from exc

    return {"status": "ready"}


@app.get("/metrics")
async def metrics() -> dict[str, dict[str, float | int]]:
    return render_metrics_snapshot()


@app.get("/metrics/prometheus")
async def metrics_prometheus() -> PlainTextResponse:
    return PlainTextResponse(render_prometheus_metrics(), media_type="text/plain; version=0.0.4")


@app.get("/slo")
async def slo() -> dict[str, float | int | bool]:
    return render_slo_snapshot(
        target_availability=settings.slo_target_availability,
        target_p95_seconds=settings.slo_target_p95_seconds,
        min_requests_for_evaluation=settings.slo_min_requests_for_evaluation,
    )
