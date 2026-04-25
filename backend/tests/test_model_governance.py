from pathlib import Path

import pytest

from app.services.model_governance import (
    compute_drift_proxy,
    load_registry,
    save_registry,
    summarize_offline_baseline,
    upsert_registry_version,
)


def test_compute_drift_proxy_with_samples() -> None:
    payload = compute_drift_proxy(
        confidences=[0.9, 0.8, 0.4, 0.2],
        predicted_labels=["a", "a", "b", "c"],
    )

    assert payload["sample_count"] == 4
    assert payload["mean_confidence"] == 0.575
    assert payload["low_confidence_rate"] == 0.5
    assert payload["prediction_entropy"] > 0


def test_summarize_offline_baseline_accuracy() -> None:
    summary = summarize_offline_baseline(
        expected_labels=["x", "y", "z"],
        predicted_labels=["x", "n", "z"],
        confidences=[0.95, 0.4, 0.75],
    )

    assert summary["samples_evaluated"] == 3
    assert summary["top1_accuracy"] == 0.666667
    assert summary["drift_proxy"]["sample_count"] == 3


def test_registry_upsert_is_idempotent_for_same_hashes(tmp_path: Path) -> None:
    registry_path = tmp_path / "registry.json"
    registry = load_registry(registry_path)

    artifact_manifest = {
        "checkpoint": {"path": "a", "sha256": "1", "size_bytes": 1},
        "onnx": {"path": "b", "sha256": "2", "size_bytes": 2},
        "labels": {"path": "c", "sha256": "3", "size_bytes": 3},
    }

    registry = upsert_registry_version(
        registry=registry,
        version="v1",
        artifact_manifest=artifact_manifest,
        source={"type": "test"},
        set_active=True,
    )
    save_registry(registry_path, registry)

    registry_again = load_registry(registry_path)
    registry_again = upsert_registry_version(
        registry=registry_again,
        version="v1",
        artifact_manifest=artifact_manifest,
        source={"type": "test"},
        set_active=True,
    )

    assert registry_again["active_version"] == "v1"
    assert len(registry_again["versions"]) == 1


def test_registry_rejects_hash_mutation_for_existing_version() -> None:
    registry = {
        "schema_version": 1,
        "active_version": "v1",
        "versions": [
            {
                "version": "v1",
                "artifacts": {
                    "checkpoint": {"path": "a", "sha256": "old", "size_bytes": 1},
                    "onnx": {"path": "b", "sha256": "2", "size_bytes": 2},
                    "labels": {"path": "c", "sha256": "3", "size_bytes": 3},
                },
            }
        ],
    }

    with pytest.raises(ValueError, match="different artifact hashes"):
        upsert_registry_version(
            registry=registry,
            version="v1",
            artifact_manifest={
                "checkpoint": {"path": "a", "sha256": "new", "size_bytes": 1},
                "onnx": {"path": "b", "sha256": "2", "size_bytes": 2},
                "labels": {"path": "c", "sha256": "3", "size_bytes": 3},
            },
            source={"type": "test"},
            set_active=False,
        )
