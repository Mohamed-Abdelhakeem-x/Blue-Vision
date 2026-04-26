from pathlib import Path

from scripts import ensure_model_artifacts


def test_resolve_checkpoint_prefers_requested_when_present(tmp_path: Path) -> None:
    requested = tmp_path / "requested.pth"
    requested.write_bytes(b"weights")

    resolved = ensure_model_artifacts._resolve_checkpoint_path(requested)

    assert resolved == requested


def test_resolve_checkpoint_falls_back_to_repo_root(monkeypatch, tmp_path: Path) -> None:
    requested = tmp_path / "missing.pth"
    root_checkpoint = tmp_path / "bluevision_model.pth"
    root_checkpoint.write_bytes(b"weights")

    monkeypatch.setattr(ensure_model_artifacts, "ROOT_CHECKPOINT", root_checkpoint)

    resolved = ensure_model_artifacts._resolve_checkpoint_path(requested)

    assert resolved == root_checkpoint


def test_resolve_checkpoint_returns_requested_when_no_fallback(monkeypatch, tmp_path: Path) -> None:
    requested = tmp_path / "missing.pth"
    root_checkpoint = tmp_path / "also-missing.pth"

    monkeypatch.setattr(ensure_model_artifacts, "ROOT_CHECKPOINT", root_checkpoint)

    resolved = ensure_model_artifacts._resolve_checkpoint_path(requested)

    assert resolved == requested
