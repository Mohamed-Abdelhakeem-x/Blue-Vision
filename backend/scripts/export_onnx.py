import json
from pathlib import Path
import sys
 
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.model_artifacts import build_model, resolve_checkpoint_path


def _select_export_state_dict(checkpoint: dict) -> dict:
    ema_state_dict = checkpoint.get("ema_state_dict")
    if isinstance(ema_state_dict, dict) and ema_state_dict:
        return ema_state_dict

    model_state_dict = checkpoint.get("model_state_dict")
    if isinstance(model_state_dict, dict) and model_state_dict:
        return model_state_dict

    return checkpoint


def export(checkpoint_path: str | Path | None = None) -> None:
    try:
        import torch
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "torch is required to export ONNX artifacts. Install backend ML dependencies first."
        ) from exc

    root = BACKEND_DIR
    model_dir = root / "model"
    model_dir.mkdir(parents=True, exist_ok=True)

    pth_path = resolve_checkpoint_path(checkpoint_path or (root.parent / "bluevision_model.pth"))
    onnx_path = model_dir / "bluevision_model.onnx"
    labels_path = model_dir / "classes.json"

    checkpoint = torch.load(pth_path, map_location="cpu", weights_only=False)
    classes = checkpoint.get("classes", [])
    arch = checkpoint.get("arch", "efficientnet_b2")
    state_dict = _select_export_state_dict(checkpoint)

    model = build_model(arch, len(classes))
    model.load_state_dict(state_dict, strict=False)
    model.eval()

    dummy_input = torch.randn(1, 3, 240, 240)
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        input_names=["image"],
        output_names=["logits"],
        dynamic_axes={"image": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=17,
    )

    labels_path.write_text(json.dumps(classes, ensure_ascii=True, indent=2), encoding="utf-8")
    print(f"Exported ONNX model to: {onnx_path}")


if __name__ == "__main__":
    export()
