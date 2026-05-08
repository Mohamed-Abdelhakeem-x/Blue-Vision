from datetime import datetime

from pydantic import BaseModel


class DetectionCandidate(BaseModel):
    index: int
    label: str
    confidence: float


class DetectionResponse(BaseModel):
    health_status: str
    fish_species: str
    disease: str
    confidence_score: float
    treatment_recommendations: str
    domain: str
    image_sha256: str | None = None
    before_image_b64: str | None = None
    after_image_b64: str | None = None
    is_low_confidence: bool = False
    analysis_note: str | None = None
    top_predictions: list[DetectionCandidate] = []


class AnalysisHistoryResponse(BaseModel):
    id: str
    health_status: str
    fish_species: str
    disease: str
    confidence_score: float
    recommendation: str
    domain: str
    created_at: datetime
    before_image_b64: str | None = None

    model_config = {"from_attributes": True}


class StatsResponse(BaseModel):
    total_scans: int
    healthy_ratio: float
    top_disease: str | None
