import json
from pathlib import Path

import numpy as np
from PIL import Image

from app.services.ai_service import AIService


class _FakeInput:
    name = "input"


class _FakeOutput:
    name = "output"


class _FakeSession:
    def __init__(self, logits: np.ndarray) -> None:
        self.logits = logits.astype(np.float32)

    def get_inputs(self):
        return [_FakeInput()]

    def get_outputs(self):
        return [_FakeOutput()]

    def run(self, output_names, feed_dict):
        return [np.expand_dims(self.logits, axis=0)]


def _service_with_logits(tmp_path: Path, logits: np.ndarray) -> AIService:
    labels_path = tmp_path / "labels.json"
    labels_path.write_text(json.dumps(["healthy", "blight"]), encoding="utf-8")

    service = AIService.__new__(AIService)
    service.model_path = tmp_path / "model.onnx"
    service.labels_path = labels_path
    service.session = _FakeSession(logits)
    service.labels = service._load_labels()
    return service


def _solid_image_bytes(color: tuple[int, int, int]) -> bytes:
    image = Image.new("RGB", (320, 320), color)
    from io import BytesIO

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_predict_accepts_realistic_leaf_signal_even_with_modest_plant_score(tmp_path):
    service = _service_with_logits(tmp_path, np.array([0.35, 0.25], dtype=np.float32))
    service._plant_likelihood = lambda image_bytes: {
        "plant_score": 0.11,
        "vegetation_ratio": 0.04,
        "gray_ratio": 0.18,
        "high_contrast_ratio": 0.02,
        "edge_density": 0.12,
    }

    image_bytes = _solid_image_bytes((95, 135, 70))
    prediction = service.predict(image_bytes)

    assert prediction["is_plant"] is True
    assert prediction["plant_score"] == 0.11


def test_predict_still_rejects_gray_low_signal_images(tmp_path):
    service = _service_with_logits(tmp_path, np.array([0.08, 0.02], dtype=np.float32))

    image_bytes = _solid_image_bytes((140, 140, 140))
    prediction = service.predict(image_bytes)

    assert prediction["is_plant"] is False


def test_variant_consensus_drops_when_crops_disagree():
    consensus = AIService._variant_consensus(
        [
            np.array([0.80, 0.20], dtype=np.float32),
            np.array([0.76, 0.24], dtype=np.float32),
            np.array([0.30, 0.70], dtype=np.float32),
            np.array([0.35, 0.65], dtype=np.float32),
        ],
        predicted_index=0,
    )

    assert consensus < 0.70


def test_calibrated_confidence_stays_realistic_for_borderline_prediction():
    confidence = AIService._calibrate_confidence(
        raw_confidence=0.43,
        margin=0.07,
        entropy=0.74,
        plant_score=0.28,
        consensus=0.58,
    )

    assert 0.30 < confidence < 0.55
