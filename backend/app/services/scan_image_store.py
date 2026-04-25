import base64
from pathlib import Path


_STORE_ROOT = Path(__file__).resolve().parents[2] / "data" / "scan_images"


def _image_path(image_sha256: str) -> Path:
    return _STORE_ROOT / f"{image_sha256}.bin"


def persist_scan_image(*, image_sha256: str, image_bytes: bytes) -> None:
    _STORE_ROOT.mkdir(parents=True, exist_ok=True)
    _image_path(image_sha256).write_bytes(image_bytes)


def load_scan_image_b64(image_sha256: str) -> str | None:
    path = _image_path(image_sha256)
    if not path.exists():
        return None
    return base64.b64encode(path.read_bytes()).decode("utf-8")