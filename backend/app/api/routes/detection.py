import base64
import hashlib
from typing import Annotated
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.db.session import get_session
from app.models.media_upload import MediaUpload
from app.models.analysis_history import AnalysisHistory
from app.models.biological_health import BiologicalHealth
from app.models.species_identification import SpeciesIdentification
from app.models.user import User
from app.models.farm_member import FarmMember
from app.models.pond import Pond
from app.models.alert import Alert
from app.schemas.scan import DetectionResponse
from app.services.recommendations import recommendation_for_label
from app.services.rate_limiter import enforce_rate_limit
from app.services.scan_image_store import persist_scan_image
from app.services.upload_validation import validate_image_upload
from app.services.label_parser import parse_fish_label
from app.core.config import get_settings

router = APIRouter(prefix="/detect", tags=["detect"])
settings = get_settings()


@router.post("", response_model=DetectionResponse)
async def detect(
    request: Request,
    image: Annotated[UploadFile, File(...)],
    pond_id: Annotated[str, Form(...)],
    domain: Annotated[Literal["color", "grayscale", "segmented"], Form()] = "color",
    segmented_image: UploadFile | None = File(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_roles("Farm Manager")),
) -> DetectionResponse:
    await enforce_rate_limit(
        request=request,
        scope="detect",
        limit=settings.rate_limit_detect_per_minute,
        window_seconds=60,
        identity=f"user:{current_user.id}",
    )

    # Validate that the pond belongs to the manager's farm
    member = (await session.execute(
        select(FarmMember).where(FarmMember.user_id == current_user.id)
    )).scalar_one_or_none()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Farm Manager does not belong to any farm."
        )

    pond = (await session.execute(
        select(Pond).where(Pond.id == pond_id, Pond.farm_id == member.farm_id)
    )).scalar_one_or_none()
    if not pond:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pond not found or access denied."
        )

    ai = getattr(router, "ai_service", None)
    if ai is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI service not ready")

    image_bytes = await image.read()
    validate_image_upload(image, image_bytes, field_name="image")

    prediction = ai.predict(image_bytes)
    is_fish = bool(prediction.get("is_fish", True))
    fish_score = float(prediction.get("fish_score", 1.0))
    if not is_fish:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The uploaded image does not appear to contain a fish. "
                f"Fish-likelihood score: {fish_score:.2f}. Please upload a clearer fish image."
            ),
        )
    if bool(prediction.get("is_uncertain", False)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The model is not confident enough about this image. "
                "Please upload a clearer close-up of a single affected fish with better lighting."
            ),
        )

    label = prediction["label"]
    confidence = prediction["confidence"]

    recommendation = recommendation_for_label(label)

    digest = hashlib.sha256(image_bytes).hexdigest()
    persist_scan_image(image_sha256=digest, image_bytes=image_bytes)

    fish_detection = ai.detect_fish(image_bytes)
    fish_count = fish_detection.get("fish_count", 0)
    detected_boxes = fish_detection.get("boxes", [])

    fish_species, health_status = parse_fish_label(label)

    # 1. Create MediaUpload
    upload = MediaUpload(
        user_id=current_user.id,
        pond_id=pond_id,
        file_type="image",
        file_path=digest,
        resolution="auto",
    )
    session.add(upload)
    await session.flush() # flush to get upload.id

    # 2. Create AnalysisHistory
    analysis = AnalysisHistory(
        upload_id=upload.id,
        suitability_score=confidence, # Mocking suitability score using confidence for now
        risk_level="high" if "healthy" not in health_status.lower() else "low",
        fish_count=fish_count,
    )
    session.add(analysis)
    await session.flush() # flush to get analysis.id

    # 3. Create BiologicalHealth
    bio_health = BiologicalHealth(
        history_id=analysis.id,
        health_status=health_status,
        disease_type=health_status if "healthy" not in health_status.lower() else None,
        confidence_score=confidence,
    )
    session.add(bio_health)

    # 4. Create SpeciesIdentification
    species_id = SpeciesIdentification(
        upload_id=upload.id,
        scientific_name=fish_species,
        confidence_score=confidence,
    )
    session.add(species_id)

    is_healthy = "healthy" in health_status.lower()
    if not is_healthy:
        pond_display = pond.name if pond.name else f"ID {pond.id[:8]}"
        alert = Alert(
            user_id=current_user.id,
            alert_type="AI Diagnostic anomaly",
            message=f"High risk of {health_status} detected in Pond '{pond_display}'. Please trigger isolation protocols immediately."
        )
        session.add(alert)

    await session.commit()

    before_b64 = base64.b64encode(image_bytes).decode("utf-8")
    after_b64 = None
    if segmented_image is not None:
        segmented_bytes = await segmented_image.read()
        if segmented_bytes:
            validate_image_upload(segmented_image, segmented_bytes, field_name="segmented_image")
            after_b64 = base64.b64encode(segmented_bytes).decode("utf-8")

    # Map YOLO bounding boxes if present, else fallback
    if detected_boxes:
        bboxes = detected_boxes
    else:
        # Generate visual mock bounding boxes coordinate mapping
        if is_healthy:
            bboxes = [
                {
                    "label": f"Healthy Nile Tilapia ({fish_species})",
                    "box": [0.15, 0.10, 0.85, 0.90],
                    "confidence": confidence
                }
            ]
        else:
            bboxes = [
                {
                    "label": f"Infected ({health_status})",
                    "box": [0.25, 0.20, 0.75, 0.80],
                    "confidence": confidence
                }
            ]

    return DetectionResponse(
        health_status=health_status,
        fish_species=fish_species,
        disease=health_status,
        confidence_score=confidence,
        treatment_recommendations=recommendation,
        domain=domain,
        fish_count=fish_count,
        image_sha256=digest,
        before_image_b64=before_b64,
        after_image_b64=after_b64,
        is_low_confidence=prediction.get("is_low_confidence", False),
        analysis_note=prediction.get("analysis_note"),
        top_predictions=prediction.get("top_predictions", []),
        bounding_boxes=bboxes,
    )
