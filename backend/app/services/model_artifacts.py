from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models


def build_model(arch: str, num_classes: int) -> nn.Module:
    arch_lower = arch.lower()

    if "mobilenet" in arch_lower:
        model = models.mobilenet_v3_large(weights=None)
        in_features = model.classifier[0].in_features
        model.classifier = nn.Sequential(
            nn.Linear(in_features, 1280),
            nn.Hardswish(inplace=True),
            nn.Dropout(p=0.2, inplace=True),
            nn.Linear(1280, num_classes),
        )
        return model

    if "efficientnet_b3" in arch_lower:
        model = models.efficientnet_b3(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier[1] = nn.Sequential(
            nn.Dropout(p=0.3, inplace=True),
            nn.Linear(in_features, num_classes),
        )
        return model

    model = models.efficientnet_b2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes),
    )
    return model


def resolve_checkpoint_path(explicit_path: str | Path) -> Path:
    path = Path(explicit_path)
    if path.exists():
        return path

    backend_dir = Path(__file__).resolve().parents[2]
    fallback = backend_dir / "model" / "bluevision_model.pth"
    if fallback.exists():
        return fallback

    raise FileNotFoundError(f"Checkpoint not found at {path} or {fallback}")
