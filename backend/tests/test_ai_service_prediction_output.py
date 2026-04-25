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


def _service(tmp_path: Path, logits: np.ndarray) -> AIService:
    labels_path = tmp_path / "classes.json"
    labels_path.write_text(json.dumps(["apple_scab", "healthy", "rust"]), encoding="utf-8")

    service = AIService.__new__(AIService)
    service.model_path = tmp_path / "model.onnx"
    service.labels_path = labels_path
    service.session = _FakeSession(logits)
    service.labels = service._load_labels()
    return service


def _image_bytes() -> bytes:
    from io import BytesIO

    image = Image.new("RGB", (320, 320), (90, 130, 70))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_predict_returns_top_predictions_and_note_for_low_confidence(tmp_path):
    service = _service(tmp_path, np.array([0.28, 0.24, 0.22], dtype=np.float32))
    service._plant_likelihood = lambda image_bytes: {
        "plant_score": 0.22,
        "vegetation_ratio": 0.12,
        "gray_ratio": 0.15,
        "high_contrast_ratio": 0.03,
        "edge_density": 0.10,
    }

    prediction = service.predict(_image_bytes())

    assert len(prediction["top_predictions"]) == 3
    assert prediction["top_predictions"][0]["label"] == prediction["label"]
    assert prediction["is_low_confidence"] is True
    assert isinstance(prediction["analysis_note"], str)
