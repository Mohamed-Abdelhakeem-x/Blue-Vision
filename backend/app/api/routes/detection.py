import base64
import hashlib
from typing import Annotated
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_session
from app.models.plant_metadata import PlantMetadata
from app.models.scan_history import ScanHistory
from app.models.user import User
from app.schemas.scan import DetectionResponse
from app.services.recommendations import recommendation_for_label
from app.services.rate_limiter import enforce_rate_limit
from app.services.scan_image_store import persist_scan_image
from app.services.upload_validation import validate_image_upload
from app.services.label_parser import parse_disease_label
from app.core.config import get_settings

router = APIRouter(prefix="/detect", tags=["detect"])
settings = get_settings()


@router.post("", response_model=DetectionResponse)
async def detect(
    request: Request,
    image: Annotated[UploadFile, File(...)],
    domain: Annotated[Literal["color", "grayscale", "segmented"], Form()] = "color",
    segmented_image: UploadFile | None = File(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DetectionResponse:
    await enforce_rate_limit(
        request=request,
        scope="detect",
        limit=settings.rate_limit_detect_per_minute,
        window_seconds=60,
        identity=f"user:{current_user.id}",
    )

    ai = getattr(router, "ai_service", None)
    if ai is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI service not ready")

    image_bytes = await image.read()
    validate_image_upload(image, image_bytes, field_name="image")

    prediction = ai.predict(image_bytes)
    is_plant = bool(prediction.get("is_plant", True))
    plant_score = float(prediction.get("plant_score", 1.0))
    if not is_plant:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The uploaded image does not appear to contain a plant plant. "
                f"Plant-likelihood score: {plant_score:.2f}. Please upload a clearer plant image."
            ),
        )
    if bool(prediction.get("is_uncertain", False)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The model is not confident enough about this image. "
                "Please upload a clearer close-up of a single affected plant with better lighting."
            ),
        )

    label = prediction["label"]
    confidence = prediction["confidence"]

    metadata_stmt = select(PlantMetadata).where(PlantMetadata.disease_type == label)
    metadata = (await session.execute(metadata_stmt)).scalar_one_or_none()
    recommendation = recommendation_for_label(label)
    if metadata is not None:
        metadata.treatment_recommendation = recommendation

    digest = hashlib.sha256(image_bytes).hexdigest()
    persist_scan_image(image_sha256=digest, image_bytes=image_bytes)
    scan = ScanHistory(
        user_id=current_user.id,
        disease_type=label,
        confidence_score=confidence,
        recommendation=recommendation,
        domain=domain,
        image_sha256=digest,
        entry_kind="scan",
    )
    session.add(scan)
    await session.commit()

    before_b64 = base64.b64encode(image_bytes).decode("utf-8")
    after_b64 = None
    if segmented_image is not None:
        segmented_bytes = await segmented_image.read()
        if segmented_bytes:
            validate_image_upload(segmented_image, segmented_bytes, field_name="segmented_image")
            after_b64 = base64.b64encode(segmented_bytes).decode("utf-8")

    plant_name, disease = parse_disease_label(label)
    return DetectionResponse(
        disease_type=label,
        plant_name=plant_name,
        disease=disease,
        confidence_score=confidence,
        treatment_recommendations=recommendation,
        domain=domain,
        image_sha256=digest,
        before_image_b64=before_b64,
        after_image_b64=after_b64,
        is_low_confidence=bool(prediction.get("is_low_confidence", False)),
        analysis_note=prediction.get("analysis_note"),
        top_predictions=prediction.get("top_predictions", []),
    )
