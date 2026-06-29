from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Form
from fastapi.responses import JSONResponse
import tempfile
import os
import shutil
import cv2
import hashlib
from typing import Dict, Any
from starlette.concurrency import run_in_threadpool

from app.services.behavior_anomaly import detector
from app.services.scan_image_store import persist_scan_image
from app.db.session import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.api.deps import require_roles
from app.models.farm_member import FarmMember
from app.models.pond import Pond
from app.models.media_upload import MediaUpload
from app.models.analysis_history import AnalysisHistory
from app.models.biological_health import BiologicalHealth
from app.models.species_identification import SpeciesIdentification
from app.models.alert import Alert

router = APIRouter(prefix="/behavior-anomaly", tags=["Behavior Anomaly Detection"])

@router.post("/predict")
async def predict_anomaly(
    file: UploadFile = File(...),
    pond_id: str = Form(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_roles("Farm Manager"))
) -> Dict[str, Any]:
    if not file.filename.endswith((".mp4", ".avi", ".mov", ".mkv")):
        raise HTTPException(status_code=400, detail="Invalid video format")
        
    try:
        # Create temporary files for input and output videos
        fd_in, in_path = tempfile.mkstemp(suffix=".mp4")
        os.close(fd_in)
        
        fd_out, out_path = tempfile.mkstemp(suffix=".mp4")
        os.close(fd_out)
        
        # Save the uploaded file
        with open(in_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Validate that the pond belongs to the manager's farm
        member = (await session.execute(
            select(FarmMember).where(FarmMember.user_id == current_user.id)
        )).scalar_one_or_none()
        if not member:
            raise HTTPException(status_code=400, detail="Farm Manager does not belong to any farm.")

        pond = (await session.execute(
            select(Pond).where(Pond.id == pond_id, Pond.farm_id == member.farm_id)
        )).scalar_one_or_none()
        if not pond:
            raise HTTPException(status_code=404, detail="Pond not found or access denied.")

        # Extract first frame for History Tab thumbnail
        file_hash = "video_behavior_scan"
        try:
            cap = cv2.VideoCapture(in_path)
            ret, frame = cap.read()
            cap.release()
            if ret and frame is not None:
                success, buffer = cv2.imencode('.jpg', frame)
                if success:
                    frame_bytes = buffer.tobytes()
                    digest = hashlib.sha256(frame_bytes).hexdigest()
                    persist_scan_image(image_sha256=digest, image_bytes=frame_bytes)
                    file_hash = digest
        except Exception:
            pass # Fallback to default if frame extraction fails

        # Run prediction in a separate thread so it doesn't block the async event loop for 3 minutes!
        result = await run_in_threadpool(detector.predict_video, in_path, out_path)
        
        is_abnormal = result["prediction"] == "Abnormal"
        health_status = "Abnormal Swimming Behavior" if is_abnormal else "Healthy Swimming Behavior"
        
        # 1. Create MediaUpload
        upload = MediaUpload(
            user_id=current_user.id,
            pond_id=pond_id,
            file_type="video",
            file_path=file_hash,
            resolution="auto",
        )
        session.add(upload)
        await session.flush()
        
        # 2. Create AnalysisHistory
        analysis = AnalysisHistory(
            upload_id=upload.id,
            suitability_score=0.95,
            risk_level="high" if is_abnormal else "low",
        )
        session.add(analysis)
        await session.flush()
        
        # 3. Create BiologicalHealth
        bio_health = BiologicalHealth(
            history_id=analysis.id,
            health_status=health_status,
            disease_type=health_status if is_abnormal else None,
            confidence_score=0.95,
        )
        session.add(bio_health)
        
        # 4. Create SpeciesIdentification for Tilapia
        species_id = SpeciesIdentification(
            upload_id=upload.id,
            scientific_name="Nile Tilapia (Behavior)",
            confidence_score=0.95,
        )
        session.add(species_id)
        
        # 5. Create Alert if abnormal
        if is_abnormal:
            pond_display = pond.name if pond.name else f"ID {pond.id[:8]}"
            alert = Alert(
                user_id=current_user.id,
                alert_type="AI Diagnostic anomaly",
                message=f"High risk of {health_status} detected in Pond '{pond_display}'. Please trigger isolation protocols immediately."
            )
            session.add(alert)

        await session.commit()
        
        # Return the prediction details
        return {
            "status": "success",
            "filename": file.filename,
            "prediction": result["prediction"],
            "healthy_tracks": result["healthy_tracks"],
            "abnormal_tracks": result["abnormal_tracks"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup input file to save disk space
        if os.path.exists(in_path):
            os.remove(in_path)
        # Note: We also remove the output file because we are not storing it long term in this implementation.
        if os.path.exists(out_path):
            os.remove(out_path)
