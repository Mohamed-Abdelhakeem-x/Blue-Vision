from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.services.model_governance import (
    build_artifact_manifest,
    load_registry,
    save_registry,
    upsert_registry_version,
)


def _build_source(args: argparse.Namespace) -> dict[str, str]:
    source: dict[str, str] = {"type": args.source_type}
    if args.commit_sha:
        source["commit_sha"] = args.commit_sha
    if args.run_id:
        source["run_id"] = args.run_id
    return source


def cmd_register(args: argparse.Namespace) -> None:
    registry_path = Path(args.registry).resolve()
    checkpoint_path = Path(args.checkpoint).resolve()
    onnx_path = Path(args.onnx).resolve()
    labels_path = Path(args.labels).resolve()

    for path in (checkpoint_path, onnx_path, labels_path):
        if not path.exists():
            raise FileNotFoundError(f"Required artifact not found: {path}")

    artifact_manifest = build_artifact_manifest(
        checkpoint_path=checkpoint_path,
        onnx_path=onnx_path,
        labels_path=labels_path,
    )

    registry = load_registry(registry_path)
    registry = upsert_registry_version(
        registry=registry,
        version=args.version,
        artifact_manifest=artifact_manifest,
        source=_build_source(args),
        set_active=args.set_active,
    )
    save_registry(registry_path, registry)

    print(json.dumps({"registry": str(registry_path), "active_version": registry.get("active_version", "")}, indent=2))


def cmd_activate(args: argparse.Namespace) -> None:
    registry_path = Path(args.registry).resolve()
    registry = load_registry(registry_path)
    versions = {item.get("version") for item in registry.get("versions", [])}
    if args.version not in versions:
        raise ValueError(f"Model version '{args.version}' not present in registry")

    registry["active_version"] = args.version
    save_registry(registry_path, registry)

    print(json.dumps({"registry": str(registry_path), "active_version": args.version}, indent=2))


def cmd_show(args: argparse.Namespace) -> None:
    registry = load_registry(Path(args.registry).resolve())
    print(json.dumps(registry, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Model registry metadata manager")
    parser.add_argument("--registry", default="backend/model/model_registry.json")

    sub = parser.add_subparsers(dest="command", required=True)

    register = sub.add_parser("register")
    register.add_argument("--version", required=True)
    register.add_argument("--checkpoint", default="plantify_model.pth")
    register.add_argument("--onnx", default="backend/model/plantify_model.onnx")
    register.add_argument("--labels", default="backend/model/classes.json")
    register.add_argument("--source-type", default="manual")
    register.add_argument("--commit-sha", default="")
    register.add_argument("--run-id", default="")
    register.add_argument("--set-active", action="store_true")
    register.set_defaults(func=cmd_register)

    activate = sub.add_parser("activate")
    activate.add_argument("--version", required=True)
    activate.set_defaults(func=cmd_activate)

    show = sub.add_parser("show")
    show.set_defaults(func=cmd_show)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
