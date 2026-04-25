from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.services.model_governance import load_registry, save_registry


def _resolve_target_version(registry: dict[str, Any], explicit_target: str | None) -> str:
    versions = [item.get("version") for item in registry.get("versions", []) if item.get("version")]
    if explicit_target:
        if explicit_target not in versions:
            raise ValueError(f"Target version '{explicit_target}' not found in registry")
        return explicit_target

    active = registry.get("active_version", "")
    if active not in versions:
        raise ValueError("Active version is not present in registry")

    active_index = versions.index(active)
    if active_index <= 0:
        raise ValueError("No previous version available for rollback")

    return versions[active_index - 1]


def create_rollback_plan(*, registry: dict[str, Any], target_version: str) -> dict[str, Any]:
    active = registry.get("active_version", "")
    target = next(item for item in registry.get("versions", []) if item.get("version") == target_version)

    return {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "from_version": active,
        "to_version": target_version,
        "artifacts": target.get("artifacts", {}),
        "rollback_ready": bool(target.get("artifacts")),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Create and optionally apply model rollback plan")
    parser.add_argument("--registry", default="backend/model/model_registry.json")
    parser.add_argument("--target-version", default="")
    parser.add_argument("--out", default="backend/model/model_rollback_plan.json")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    registry_path = Path(args.registry).resolve()
    registry = load_registry(registry_path)

    target_version = _resolve_target_version(registry, args.target_version or None)
    plan = create_rollback_plan(registry=registry, target_version=target_version)

    if args.apply:
        registry["active_version"] = target_version
        save_registry(registry_path, registry)
        plan["applied"] = True
    else:
        plan["applied"] = False

    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(plan, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(plan, indent=2))


if __name__ == "__main__":
    main()
