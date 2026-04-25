from __future__ import annotations

import hashlib
import json
import math
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_artifact_manifest(*, checkpoint_path: Path, onnx_path: Path, labels_path: Path) -> dict[str, Any]:
    return {
        "checkpoint": {
            "path": str(checkpoint_path).replace("\\", "/"),
            "sha256": sha256_file(checkpoint_path),
            "size_bytes": checkpoint_path.stat().st_size,
        },
        "onnx": {
            "path": str(onnx_path).replace("\\", "/"),
            "sha256": sha256_file(onnx_path),
            "size_bytes": onnx_path.stat().st_size,
        },
        "labels": {
            "path": str(labels_path).replace("\\", "/"),
            "sha256": sha256_file(labels_path),
            "size_bytes": labels_path.stat().st_size,
        },
    }


def _default_registry() -> dict[str, Any]:
    return {
        "schema_version": 1,
        "active_version": "",
        "versions": [],
    }


def load_registry(registry_path: Path) -> dict[str, Any]:
    if not registry_path.exists():
        return _default_registry()
    return json.loads(registry_path.read_text(encoding="utf-8"))


def save_registry(registry_path: Path, registry: dict[str, Any]) -> None:
    registry_path.parent.mkdir(parents=True, exist_ok=True)
    registry_path.write_text(json.dumps(registry, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")


def upsert_registry_version(
    *,
    registry: dict[str, Any],
    version: str,
    artifact_manifest: dict[str, Any],
    source: dict[str, Any],
    set_active: bool,
) -> dict[str, Any]:
    versions = registry.setdefault("versions", [])
    existing = next((item for item in versions if item.get("version") == version), None)

    now_iso = datetime.now(timezone.utc).isoformat()
    if existing is not None:
        if existing.get("artifacts") != artifact_manifest:
            raise ValueError(f"Model version '{version}' already exists with different artifact hashes")
        existing["updated_at"] = now_iso
        existing["source"] = source
    else:
        versions.append(
            {
                "version": version,
                "created_at": now_iso,
                "updated_at": now_iso,
                "source": source,
                "artifacts": artifact_manifest,
            }
        )

    if set_active:
        registry["active_version"] = version

    return registry


def compute_drift_proxy(*, confidences: list[float], predicted_labels: list[str]) -> dict[str, float | int]:
    if not confidences:
        return {
            "sample_count": 0,
            "mean_confidence": 0.0,
            "p05_confidence": 0.0,
            "p95_confidence": 0.0,
            "low_confidence_rate": 0.0,
            "prediction_entropy": 0.0,
        }

    sorted_conf = sorted(confidences)
    n = len(sorted_conf)
    p05 = sorted_conf[max(0, int((n - 1) * 0.05))]
    p95 = sorted_conf[min(n - 1, int((n - 1) * 0.95))]
    low_conf = sum(1 for value in confidences if value < 0.5)

    label_counts = Counter(predicted_labels)
    entropy = 0.0
    for count in label_counts.values():
        p = count / max(1, len(predicted_labels))
        if p > 0:
            entropy -= p * math.log2(p)

    return {
        "sample_count": len(confidences),
        "mean_confidence": round(sum(confidences) / len(confidences), 6),
        "p05_confidence": round(p05, 6),
        "p95_confidence": round(p95, 6),
        "low_confidence_rate": round(low_conf / len(confidences), 6),
        "prediction_entropy": round(entropy, 6),
    }


def summarize_offline_baseline(
    *,
    expected_labels: list[str],
    predicted_labels: list[str],
    confidences: list[float],
) -> dict[str, Any]:
    total = min(len(expected_labels), len(predicted_labels), len(confidences))
    if total == 0:
        return {
            "samples_evaluated": 0,
            "top1_accuracy": 0.0,
            "drift_proxy": compute_drift_proxy(confidences=[], predicted_labels=[]),
        }

    correct = 0
    for idx in range(total):
        if expected_labels[idx] == predicted_labels[idx]:
            correct += 1

    return {
        "samples_evaluated": total,
        "top1_accuracy": round(correct / total, 6),
        "drift_proxy": compute_drift_proxy(
            confidences=confidences[:total],
            predicted_labels=predicted_labels[:total],
        ),
    }
