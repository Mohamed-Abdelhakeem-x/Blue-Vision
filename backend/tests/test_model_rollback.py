import json
from pathlib import Path

import pytest

from scripts.model_rollback import create_rollback_plan


def test_create_rollback_plan_contains_target_artifacts() -> None:
    registry = {
        "active_version": "v2",
        "versions": [
            {"version": "v1", "artifacts": {"onnx": {"sha256": "aaa"}}},
            {"version": "v2", "artifacts": {"onnx": {"sha256": "bbb"}}},
        ],
    }

    plan = create_rollback_plan(registry=registry, target_version="v1")
    assert plan["from_version"] == "v2"
    assert plan["to_version"] == "v1"
    assert plan["rollback_ready"] is True


def test_model_rollback_script_apply_updates_registry(tmp_path: Path) -> None:
    registry_path = tmp_path / "registry.json"
    registry_payload = {
        "schema_version": 1,
        "active_version": "v2",
        "versions": [
            {"version": "v1", "artifacts": {"onnx": {"sha256": "111"}}},
            {"version": "v2", "artifacts": {"onnx": {"sha256": "222"}}},
        ],
    }
    registry_path.write_text(json.dumps(registry_payload), encoding="utf-8")

    from scripts import model_rollback as rollback

    plan_path = tmp_path / "plan.json"
    argv = [
        "model_rollback.py",
        "--registry",
        str(registry_path),
        "--target-version",
        "v1",
        "--out",
        str(plan_path),
        "--apply",
    ]

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr("sys.argv", argv)
        rollback.main()

    updated = json.loads(registry_path.read_text(encoding="utf-8"))
    assert updated["active_version"] == "v1"

    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    assert plan["applied"] is True
    assert plan["to_version"] == "v1"
