from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
import onnxruntime as ort
from PIL import Image

from app.services.model_governance import summarize_offline_baseline


def _load_labels(labels_path: Path) -> list[str]:
    payload = json.loads(labels_path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("classes.json must contain a JSON array of class labels")
    return [str(item) for item in payload]


def _preprocess(image_path: Path) -> np.ndarray:
    image = Image.open(image_path).convert("RGB")
    image = image.resize((240, 240))
    arr = np.asarray(image).astype("float32") / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype="float32")
    std = np.array([0.229, 0.224, 0.225], dtype="float32")
    arr = (arr - mean) / std
    arr = np.transpose(arr, (2, 0, 1))
    return np.expand_dims(arr, axis=0)


def _iter_dataset(dataset_root: Path, max_samples: int) -> list[tuple[Path, str]]:
    samples: list[tuple[Path, str]] = []
    for class_dir in sorted(path for path in dataset_root.iterdir() if path.is_dir()):
        for image_path in sorted(class_dir.glob("*")):
            if image_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue
            samples.append((image_path, class_dir.name))
            if len(samples) >= max_samples:
                return samples
    return samples


def evaluate(*, onnx_path: Path, labels_path: Path, dataset_root: Path, max_samples: int) -> dict[str, Any]:
    labels = _load_labels(labels_path)
    samples = _iter_dataset(dataset_root, max_samples=max_samples)

    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name

    expected_labels: list[str] = []
    predicted_labels: list[str] = []
    confidences: list[float] = []

    for image_path, expected_label in samples:
        inputs = _preprocess(image_path)
        logits = session.run(None, {input_name: inputs})[0][0]
        logits = np.asarray(logits, dtype="float64")
        exps = np.exp(logits - np.max(logits))
        probs = exps / np.sum(exps)

        idx = int(np.argmax(probs))
        predicted_label = labels[idx] if idx < len(labels) else f"idx:{idx}"

        expected_labels.append(expected_label)
        predicted_labels.append(predicted_label)
        confidences.append(float(probs[idx]))

    summary = summarize_offline_baseline(
        expected_labels=expected_labels,
        predicted_labels=predicted_labels,
        confidences=confidences,
    )
    summary["dataset_root"] = str(dataset_root).replace("\\", "/")
    summary["samples_requested"] = max_samples
    summary["samples_used"] = len(expected_labels)

    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Offline model baseline evaluation with drift proxy metrics")
    parser.add_argument("--onnx", default="backend/model/bluevision_model.onnx")
    parser.add_argument("--labels", default="backend/model/classes.json")
    parser.add_argument("--dataset", default="dataset/color")
    parser.add_argument("--max-samples", type=int, default=300)
    parser.add_argument("--out", default="backend/model/baseline_eval.json")
    args = parser.parse_args()

    onnx_path = Path(args.onnx).resolve()
    labels_path = Path(args.labels).resolve()
    dataset_root = Path(args.dataset).resolve()

    if not onnx_path.exists():
        raise FileNotFoundError(f"ONNX model not found: {onnx_path}")
    if not labels_path.exists():
        raise FileNotFoundError(f"Labels file not found: {labels_path}")
    if not dataset_root.exists():
        raise FileNotFoundError(f"Dataset root not found: {dataset_root}")

    summary = evaluate(
        onnx_path=onnx_path,
        labels_path=labels_path,
        dataset_root=dataset_root,
        max_samples=args.max_samples,
    )

    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(summary, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote baseline evaluation report to {out_path}")


if __name__ == "__main__":
    main()
