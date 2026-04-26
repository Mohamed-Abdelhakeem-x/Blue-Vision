from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
REPO_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

MODEL_DIR = BACKEND_DIR / "model"
DEFAULT_ONNX = MODEL_DIR / "bluevision_model.onnx"
DEFAULT_LABELS = MODEL_DIR / "classes.json"
DEFAULT_CHECKPOINT = MODEL_DIR / "bluevision_model.pth"
DEFAULT_REGISTRY = MODEL_DIR / "model_registry.json"
ROOT_CHECKPOINT = REPO_ROOT / "bluevision_model.pth"


def _load_bootstrap_classes(raw: str | None) -> list[str]:
    if raw:
        parsed = [item.strip() for item in raw.split(",") if item.strip()]
        if parsed:
            return parsed
    return ["unknown_plant", "healthy", "diseased"]


def _resolve_checkpoint_path(requested_checkpoint: Path) -> Path:
    if requested_checkpoint.exists():
        return requested_checkpoint

    if ROOT_CHECKPOINT.exists():
        return ROOT_CHECKPOINT

    return requested_checkpoint


def _write_bootstrap_checkpoint(checkpoint_path: Path, classes: list[str], arch: str) -> None:
    try:
        import torch
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "torch is required to create a bootstrap checkpoint during image build."
        ) from exc

    from app.services.model_artifacts import build_model

    model = build_model(arch, len(classes))
    checkpoint = {
        "arch": arch,
        "classes": classes,
        "model_state_dict": model.state_dict(),
    }
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(checkpoint, checkpoint_path)


def _ensure_exported_artifacts(checkpoint_path: Path, *, force_export: bool) -> None:
    if not force_export and DEFAULT_ONNX.exists() and DEFAULT_LABELS.exists():
        return

    from scripts.export_onnx import export as export_onnx

    export_onnx(checkpoint_path)


def _register_active_version(
    *,
    checkpoint_path: Path,
    run_id: str,
    commit_sha: str,
    source_type: str,
    version_prefix: str,
) -> None:
    from app.services.model_governance import (
        build_artifact_manifest,
        load_registry,
        save_registry,
        upsert_registry_version,
    )

    artifact_manifest = build_artifact_manifest(
        checkpoint_path=checkpoint_path,
        onnx_path=DEFAULT_ONNX,
        labels_path=DEFAULT_LABELS,
    )

    registry = load_registry(DEFAULT_REGISTRY)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    sha_short = (commit_sha[:7] if commit_sha else "local")
    version = f"{version_prefix}-{sha_short}-{timestamp}"

    source: dict[str, str] = {"type": source_type}
    if commit_sha:
        source["commit_sha"] = commit_sha
    if run_id:
        source["run_id"] = run_id

    registry = upsert_registry_version(
        registry=registry,
        version=version,
        artifact_manifest=artifact_manifest,
        source=source,
        set_active=True,
    )
    save_registry(DEFAULT_REGISTRY, registry)


def ensure_model_artifacts(args: argparse.Namespace) -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    requested_checkpoint_path = Path(args.checkpoint).resolve()
    checkpoint_path = _resolve_checkpoint_path(requested_checkpoint_path)
    checkpoint_exists = checkpoint_path.exists()

    if not checkpoint_exists:
        classes = _load_bootstrap_classes(args.bootstrap_classes)
        _write_bootstrap_checkpoint(checkpoint_path=requested_checkpoint_path, classes=classes, arch=args.arch)
        checkpoint_path = requested_checkpoint_path
        source_type = "ci-bootstrap"
    else:
        source_type = "checkpoint-export"

    _ensure_exported_artifacts(
        checkpoint_path=checkpoint_path,
        force_export=checkpoint_exists,
    )

    _register_active_version(
        checkpoint_path=checkpoint_path,
        run_id=args.run_id,
        commit_sha=args.commit_sha,
        source_type=source_type,
        version_prefix=args.version_prefix,
    )

    summary = {
        "requested_checkpoint": str(requested_checkpoint_path),
        "checkpoint": str(checkpoint_path),
        "checkpoint_created": not checkpoint_exists,
        "onnx": str(DEFAULT_ONNX),
        "labels": str(DEFAULT_LABELS),
        "registry": str(DEFAULT_REGISTRY),
        "active_version": json.loads(DEFAULT_REGISTRY.read_text(encoding="utf-8")).get("active_version", ""),
    }
    print(json.dumps(summary, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Ensure model artifacts are present for runtime and deployment")
    parser.add_argument("--checkpoint", default=str(DEFAULT_CHECKPOINT))
    parser.add_argument("--arch", default="efficientnet_b3")
    parser.add_argument("--bootstrap-classes", default=os.getenv("MODEL_BOOTSTRAP_CLASSES", ""))
    parser.add_argument("--version-prefix", default=os.getenv("MODEL_VERSION_PREFIX", "ci"))
    parser.add_argument("--run-id", default=os.getenv("GITHUB_RUN_ID", ""))
    parser.add_argument("--commit-sha", default=os.getenv("GITHUB_SHA", ""))
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    ensure_model_artifacts(args)


if __name__ == "__main__":
    main()
