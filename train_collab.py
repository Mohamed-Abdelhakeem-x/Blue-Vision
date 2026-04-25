from __future__ import annotations

import argparse
import copy
import json
import os
import random
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from torch import nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR, OneCycleLR
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import models, transforms

Image.MAX_IMAGE_PIXELS = None

# ---------------------------------------------------------------------------
# Kaggle dataset auto-download
# ---------------------------------------------------------------------------
# Dataset A: vipoooool/new-plant-diseases-dataset  →  train/valid layout
# Dataset B: abdallahalidev/plantvillage-dataset   →  color/grayscale/segmented layout
_KAGGLE_DATASET_SLUGS = [
    "abdallahalidev/plantvillage-dataset",       # preferred: matches color/grayscale/segmented layout
    "vipoooool/new-plant-diseases-dataset",      # fallback:  uses train/ layout
]


def _find_dataset_subroot(root: Path, max_depth: int = 4) -> Path | None:
    """BFS search for a directory holding color/, grayscale/, segmented/, or train/ with class subdirs."""
    if not root.exists():
        return None
    queue: list[tuple[Path, int]] = [(root, 0)]
    while queue:
        current, depth = queue.pop(0)
        for sub in ("color", "grayscale", "segmented", "train"):
            subdir = current / sub
            try:
                if subdir.is_dir() and any(p.is_dir() for p in subdir.iterdir()):
                    return current
            except PermissionError:
                pass
        if depth < max_depth:
            try:
                for child in sorted(current.iterdir()):
                    if child.is_dir():
                        queue.append((child, depth + 1))
            except PermissionError:
                pass
    return None


def download_kaggle_dataset(download_dir: Path) -> Path | None:
    """Download one of the known Kaggle datasets and return its dataset root, or None on failure."""
    try:
        import kaggle  # type: ignore[import-untyped]
        kaggle.api.authenticate()
    except ImportError:
        print("[dataset] 'kaggle' package not found.  Run: pip install kaggle")
        print("[dataset] Then place ~/.kaggle/kaggle.json or set KAGGLE_USERNAME + KAGGLE_KEY env vars.")
        return None
    except Exception as exc:
        print(f"[dataset] Kaggle auth failed: {exc}")
        print("[dataset] Set KAGGLE_USERNAME and KAGGLE_KEY env vars, or place ~/.kaggle/kaggle.json")
        return None

    download_dir.mkdir(parents=True, exist_ok=True)
    for slug in _KAGGLE_DATASET_SLUGS:
        dest = download_dir / slug.split("/")[-1]
        if dest.exists():
            found = _find_dataset_subroot(dest)
            if found:
                print(f"[dataset] Using cached download at {found}")
                return found
        try:
            print(f"[dataset] Downloading kaggle:{slug} → {dest} ...")
            kaggle.api.dataset_download_files(slug, path=str(dest), unzip=True, quiet=False)
            found = _find_dataset_subroot(dest)
            if found:
                return found
            print(f"[dataset] Warning: could not locate dataset root inside {dest}")
        except Exception as exc:
            print(f"[dataset] Failed to download {slug}: {exc}")
    print("[dataset] All download attempts failed.  Pass --dataset-root to specify data manually.")
    return None


@dataclass
class TrainingConfig:
    dataset_root: Path
    extra_dataset_roots: list[Path]
    extra_dataset_tomato_only: bool
    checkpoint_path: Path
    classes_path: Path
    arch: str = "efficientnet_b2"
    epochs: int = 20
    batch_size: int = 32
    lr: float = 4e-4
    weight_decay: float = 1e-2
    val_split: float = 0.18
    workers: int = 4
    image_size: int = 240
    seed: int = 42
    mixup_alpha: float = 0.22
    freeze_backbone_epochs: int = 2
    patience: int = 6
    min_delta: float = 1e-3
    use_ema: bool = True
    ema_decay: float = 0.999
    tta_runs: int = 2
    scheduler: str = "onecycle"
    randaugment_ops: int = 2
    randaugment_magnitude: int = 7
    random_erasing_p: float = 0.25
    random_erasing_scale: tuple[float, float] = (0.02, 0.12)
    dropout: float = 0.3
    resume: bool = False
    pin_memory: bool | None = None


class PlantifyDataset(Dataset):
    def __init__(self, samples: list[tuple[Path, int]], transform: transforms.Compose) -> None:
        self.samples = samples
        self.transform = transform

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, int]:
        path, label = self.samples[index]
        image = Image.open(path).convert("RGB")
        return self.transform(image), label


class ModelEMA:
    def __init__(self, model: nn.Module, decay: float) -> None:
        self.decay = float(decay)
        self.ema_model = copy.deepcopy(model).eval()
        for parameter in self.ema_model.parameters():
            parameter.requires_grad_(False)

    @torch.no_grad()
    def update(self, model: nn.Module) -> None:
        ema_state = self.ema_model.state_dict()
        model_state = model.state_dict()
        for key, ema_value in ema_state.items():
            model_value = model_state[key].detach()
            if torch.is_floating_point(ema_value):
                ema_value.mul_(self.decay).add_(model_value, alpha=1.0 - self.decay)
            else:
                ema_value.copy_(model_value)


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def resolve_device() -> torch.device:
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def _is_tomato_class(class_name: str) -> bool:
    normalized = class_name.strip().lower().replace("-", "_").replace(" ", "_")
    return normalized.startswith("tomato___") or normalized.startswith("tomato_")


def _collect_samples_from_root(dataset_root: Path, *, tomato_only: bool = False) -> list[tuple[Path, str]]:
    domain_dirs = [dataset_root / "color", dataset_root / "grayscale", dataset_root / "segmented", dataset_root / "train"]
    samples: list[tuple[Path, str]] = []

    for domain_dir in domain_dirs:
        if not domain_dir.exists():
            continue
        for class_dir in sorted(path for path in domain_dir.iterdir() if path.is_dir()):
            if tomato_only and not _is_tomato_class(class_dir.name):
                continue
            for image_path in class_dir.glob("**/*"):
                if image_path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
                    samples.append((image_path, class_dir.name))

    return samples


def collect_samples(dataset_roots: list[Path], *, extra_dataset_tomato_only: bool = False) -> tuple[list[tuple[Path, str]], list[str]]:
    class_names: set[str] = set()
    samples: list[tuple[Path, str]] = []
    seen_paths: set[str] = set()

    for index, dataset_root in enumerate(dataset_roots):
        if not dataset_root.exists():
            continue
        tomato_only = extra_dataset_tomato_only and index > 0
        for image_path, class_name in _collect_samples_from_root(dataset_root, tomato_only=tomato_only):
            resolved = str(image_path.resolve())
            if resolved in seen_paths:
                continue
            seen_paths.add(resolved)
            class_names.add(class_name)
            samples.append((image_path, class_name))

    classes = sorted(class_names)
    if not samples:
        searched = ", ".join(str(path) for path in dataset_roots)
        raise RuntimeError(f"No images found under {searched}")
    return samples, classes


def split_by_class(
    raw_samples: list[tuple[Path, str]],
    class_to_idx: dict[str, int],
    val_split: float,
    seed: int,
) -> tuple[list[tuple[Path, int]], list[tuple[Path, int]]]:
    grouped: dict[str, list[Path]] = {}
    for image_path, class_name in raw_samples:
        grouped.setdefault(class_name, []).append(image_path)

    rng = random.Random(seed)
    train_samples: list[tuple[Path, int]] = []
    val_samples: list[tuple[Path, int]] = []

    for class_name, paths in grouped.items():
        rng.shuffle(paths)
        holdout = max(1, int(len(paths) * val_split)) if len(paths) > 4 else 1
        val_paths = paths[:holdout]
        train_paths = paths[holdout:] or paths[:1]
        idx = class_to_idx[class_name]
        train_samples.extend((path, idx) for path in train_paths)
        val_samples.extend((path, idx) for path in val_paths)

    return train_samples, val_samples


def build_sampler(samples: list[tuple[Path, int]], num_classes: int) -> WeightedRandomSampler:
    counts = np.zeros(num_classes, dtype=np.int64)
    for _, label in samples:
        counts[label] += 1
    class_weights = np.where(counts > 0, 1.0 / counts, 0.0)
    sample_weights = [float(class_weights[label]) for _, label in samples]
    return WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)


def build_model(arch: str, num_classes: int, dropout: float, pretrained: bool = True) -> nn.Module:
    arch_lower = arch.lower()

    if arch_lower == "mobilenet_v3_large":
        weights = models.MobileNet_V3_Large_Weights.IMAGENET1K_V1 if pretrained else None
        model = models.mobilenet_v3_large(weights=weights)
        in_features = model.classifier[0].in_features
        model.classifier = nn.Sequential(
            nn.Linear(in_features, 1280),
            nn.Hardswish(inplace=True),
            nn.Dropout(p=dropout, inplace=True),
            nn.Linear(1280, num_classes),
        )
        return model

    if arch_lower == "efficientnet_b3":
        weights = models.EfficientNet_B3_Weights.IMAGENET1K_V1 if pretrained else None
        model = models.efficientnet_b3(weights=weights)
        in_features = model.classifier[1].in_features
        model.classifier[1] = nn.Sequential(nn.Dropout(dropout), nn.Linear(in_features, num_classes))
        return model

    weights = models.EfficientNet_B2_Weights.IMAGENET1K_V1 if pretrained else None
    model = models.efficientnet_b2(weights=weights)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Sequential(nn.Dropout(dropout), nn.Linear(in_features, num_classes))
    return model


def set_backbone_trainable(model: nn.Module, arch: str, trainable: bool) -> None:
    arch_lower = arch.lower()
    if arch_lower == "mobilenet_v3_large":
        parameters = model.features.parameters()
    else:
        parameters = model.features.parameters()
    for parameter in parameters:
        parameter.requires_grad = trainable


def apply_mixup(inputs: torch.Tensor, labels: torch.Tensor, alpha: float) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, float]:
    if alpha <= 0:
        return inputs, labels, labels, 1.0
    lam = float(np.random.beta(alpha, alpha))
    index = torch.randperm(inputs.size(0), device=inputs.device)
    mixed_inputs = (lam * inputs) + ((1.0 - lam) * inputs[index])
    return mixed_inputs, labels, labels[index], lam


def compute_topk_accuracy(logits: torch.Tensor, labels: torch.Tensor, k: int) -> float:
    topk = torch.topk(logits, k=min(k, logits.shape[1]), dim=1).indices
    return float(topk.eq(labels.unsqueeze(1)).any(dim=1).float().mean().item())


def tta_logits(model: nn.Module, inputs: torch.Tensor, runs: int) -> torch.Tensor:
    runs = max(1, min(int(runs), 3))
    total: torch.Tensor | None = None
    for idx in range(runs):
        if idx == 0:
            augmented = inputs
        elif idx == 1:
            augmented = torch.flip(inputs, dims=[3])
        else:
            augmented = torch.flip(inputs, dims=[2])
        logits = model(augmented)
        total = logits if total is None else total + logits
    return total / runs


def evaluate(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
    tta_runs: int = 1,
) -> dict[str, float]:
    model.eval()
    total_loss = 0.0
    total = 0
    top1_sum = 0.0
    top3_sum = 0.0
    with torch.no_grad():
        for inputs, labels in loader:
            inputs = inputs.to(device)
            labels = labels.to(device)
            logits = tta_logits(model, inputs, runs=tta_runs)
            loss = criterion(logits, labels)
            batch_size = labels.size(0)
            total += batch_size
            total_loss += float(loss.item())
            top1_sum += compute_topk_accuracy(logits, labels, k=1) * batch_size
            top3_sum += compute_topk_accuracy(logits, labels, k=3) * batch_size
    return {
        "loss": total_loss / max(1, len(loader)),
        "top1": top1_sum / max(1, total),
        "top3": top3_sum / max(1, total),
    }


def build_transforms(config: TrainingConfig) -> tuple[transforms.Compose, transforms.Compose]:
    train_tf = transforms.Compose(
        [
            transforms.RandomResizedCrop(config.image_size, scale=(0.68, 1.0), ratio=(0.8, 1.2)),
            transforms.RandAugment(num_ops=config.randaugment_ops, magnitude=config.randaugment_magnitude),
            transforms.RandomHorizontalFlip(),
            transforms.RandomVerticalFlip(p=0.2),
            transforms.RandomRotation(18),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.06),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            transforms.RandomErasing(
                p=config.random_erasing_p,
                scale=config.random_erasing_scale,
                ratio=(0.3, 3.3),
                value="random",
            ),
        ]
    )
    val_tf = transforms.Compose(
        [
            transforms.Resize(max(256, config.image_size + 48)),
            transforms.CenterCrop(config.image_size),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )
    return train_tf, val_tf


def verify_checkpoint_artifacts(checkpoint_path: Path, classes_path: Path, image_size: int) -> bool:
    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")
    if not classes_path.exists():
        raise FileNotFoundError(f"Classes file not found: {classes_path}")

    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    classes = json.loads(classes_path.read_text(encoding="utf-8"))
    arch = checkpoint.get("arch", "efficientnet_b2")
    dropout = 0.2 if arch.lower() == "mobilenet_v3_large" else 0.3
    model = build_model(arch, len(classes), dropout=dropout, pretrained=False)
    state_dict = checkpoint.get("ema_state_dict") or checkpoint.get("model_state_dict") or checkpoint
    model.load_state_dict(state_dict, strict=False)
    model.eval()

    test_input = torch.randn(1, 3, image_size, image_size)
    with torch.no_grad():
        output = model(test_input)

    if output.shape[1] != len(classes):
        raise RuntimeError(f"Verification failed: output width {output.shape[1]} != classes {len(classes)}")

    print(f"Verification passed for {checkpoint_path.name}: arch={arch}, classes={len(classes)}, output={tuple(output.shape)}")
    return True


def train_model(config: TrainingConfig) -> None:
    set_seed(config.seed)
    device = resolve_device()
    pin_memory = device.type == "cuda" if config.pin_memory is None else config.pin_memory

    dataset_roots = [config.dataset_root, *config.extra_dataset_roots]
    raw_samples, classes = collect_samples(dataset_roots, extra_dataset_tomato_only=config.extra_dataset_tomato_only)
    class_to_idx = {class_name: idx for idx, class_name in enumerate(classes)}
    train_samples, val_samples = split_by_class(raw_samples, class_to_idx, config.val_split, config.seed)
    train_tf, val_tf = build_transforms(config)

    train_ds = PlantifyDataset(train_samples, train_tf)
    val_ds = PlantifyDataset(val_samples, val_tf)
    train_loader = DataLoader(
        train_ds,
        batch_size=config.batch_size,
        sampler=build_sampler(train_samples, len(classes)),
        num_workers=config.workers,
        pin_memory=pin_memory,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=config.batch_size,
        shuffle=False,
        num_workers=max(1, config.workers // 2),
        pin_memory=pin_memory,
    )

    model = build_model(config.arch, len(classes), dropout=config.dropout, pretrained=True).to(device)
    set_backbone_trainable(model, config.arch, trainable=False)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = AdamW(model.parameters(), lr=config.lr, weight_decay=config.weight_decay)
    if config.scheduler == "onecycle":
        scheduler = OneCycleLR(
            optimizer,
            max_lr=config.lr,
            epochs=config.epochs,
            steps_per_epoch=max(1, len(train_loader)),
            pct_start=0.2,
            anneal_strategy="cos",
        )
    else:
        scheduler = CosineAnnealingLR(optimizer, T_max=config.epochs, eta_min=1e-6)

    scaler = torch.amp.GradScaler("cuda") if device.type == "cuda" else None
    ema = ModelEMA(model, decay=config.ema_decay) if config.use_ema else None

    start_epoch = 1
    best_metric = -1.0
    patience_counter = 0
    if config.resume and config.checkpoint_path.exists():
        checkpoint = torch.load(config.checkpoint_path, map_location="cpu", weights_only=False)
        model.load_state_dict(checkpoint.get("model_state_dict", checkpoint), strict=False)
        if ema is not None and checkpoint.get("ema_state_dict") is not None:
            ema.ema_model.load_state_dict(checkpoint["ema_state_dict"], strict=False)
        best_metric = float(checkpoint.get("val_top1", checkpoint.get("val_accuracy", -1.0)))
        start_epoch = int(checkpoint.get("epoch", 0)) + 1
        print(f"Resumed training from epoch {start_epoch}")

    print(
        f"Training {config.arch} on {device} | roots={len(dataset_roots)} train={len(train_ds)} val={len(val_ds)} | "
        f"batch={config.batch_size} workers={config.workers}"
    )

    for epoch in range(start_epoch, config.epochs + 1):
        if epoch == config.freeze_backbone_epochs + 1:
            set_backbone_trainable(model, config.arch, trainable=True)

        model.train()
        train_loss = 0.0
        for inputs, labels in train_loader:
            inputs = inputs.to(device)
            labels = labels.to(device)
            optimizer.zero_grad(set_to_none=True)
            mixed_inputs, labels_a, labels_b, lam = apply_mixup(inputs, labels, config.mixup_alpha)

            if scaler is not None:
                with torch.autocast(device_type="cuda", dtype=torch.float16):
                    logits = model(mixed_inputs)
                    loss = (lam * criterion(logits, labels_a)) + ((1.0 - lam) * criterion(logits, labels_b))
                scaler.scale(loss).backward()
                scaler.unscale_(optimizer)
                nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                scaler.step(optimizer)
                scaler.update()
            else:
                logits = model(mixed_inputs)
                loss = (lam * criterion(logits, labels_a)) + ((1.0 - lam) * criterion(logits, labels_b))
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()

            if ema is not None:
                ema.update(model)

            if config.scheduler == "onecycle":
                scheduler.step()
            train_loss += float(loss.item())

        if config.scheduler != "onecycle":
            scheduler.step()

        eval_model = ema.ema_model if ema is not None else model
        val_metrics = evaluate(eval_model, val_loader, criterion, device, tta_runs=config.tta_runs)
        avg_train_loss = train_loss / max(1, len(train_loader))
        print(
            f"Epoch {epoch:02d}/{config.epochs} | train_loss={avg_train_loss:.4f} | "
            f"val_loss={val_metrics['loss']:.4f} val_top1={val_metrics['top1']:.4f} val_top3={val_metrics['top3']:.4f}"
        )

        if val_metrics["top1"] > (best_metric + config.min_delta):
            best_metric = val_metrics["top1"]
            patience_counter = 0
            config.checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
            config.classes_path.parent.mkdir(parents=True, exist_ok=True)
            checkpoint = {
                "model_state_dict": model.state_dict(),
                "ema_state_dict": ema.ema_model.state_dict() if ema is not None else None,
                "classes": classes,
                "arch": config.arch,
                "epoch": epoch,
                "val_top1": val_metrics["top1"],
                "val_top3": val_metrics["top3"],
                "val_loss": val_metrics["loss"],
                "tta_runs": config.tta_runs,
                "ema_decay": config.ema_decay,
            }
            torch.save(checkpoint, config.checkpoint_path)
            config.classes_path.write_text(json.dumps(classes, ensure_ascii=True, indent=2), encoding="utf-8")
            print(f"Saved best checkpoint -> {config.checkpoint_path}")
        else:
            patience_counter += 1
            if patience_counter >= config.patience:
                print(f"Early stopping: no validation improvement for {config.patience} epochs")
                break

    verify_checkpoint_artifacts(config.checkpoint_path, config.classes_path, config.image_size)


def resolve_dataset_root(repo_root: Path) -> Path:
    candidates = [
        repo_root / "dataset",
        Path("/content/drive/MyDrive/plantify/dataset"),
        Path("/content/dataset"),
        Path("/content/plantify/dataset"),
    ]
    for candidate in candidates:
        found = _find_dataset_subroot(candidate)
        if found:
            return found
    download_dir = Path("/content/downloads") if Path("/content").exists() else repo_root / "downloads"
    downloaded = download_kaggle_dataset(download_dir)
    return downloaded or (repo_root / "dataset")


def parse_extra_dataset_roots(value: str | None) -> list[Path]:
    if not value:
        return []
    return [Path(item.strip()) for item in value.split(os.pathsep) if item.strip()]


def parse_env_flag(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def default_worker_count() -> int:
    cpu_count = os.cpu_count() or 2
    return max(1, min(4, cpu_count))


def parse_args() -> argparse.Namespace:
    repo_root = Path(__file__).resolve().parent if "__file__" in dir() else Path.cwd()
    backend_model_dir = repo_root / "backend" / "model"
    parser = argparse.ArgumentParser(description="Train Plantify in Google Colab or similar notebook environments.")
    parser.add_argument("--dataset-root", type=Path, default=resolve_dataset_root(repo_root))
    parser.add_argument("--extra-dataset-root", dest="extra_dataset_roots", action="append", type=Path, default=None)
    parser.add_argument("--checkpoint-path", type=Path, default=backend_model_dir / "plantify_model.pth")
    parser.add_argument("--classes-path", type=Path, default=backend_model_dir / "classes.json")
    parser.add_argument("--extra-dataset-tomato-only", action="store_true")
    parser.add_argument("--arch", choices=["efficientnet_b2", "efficientnet_b3", "mobilenet_v3_large"], default="efficientnet_b2")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=4e-4)
    parser.add_argument("--workers", type=int, default=default_worker_count())
    parser.add_argument("--resume", action="store_true")
    return parser.parse_args([] if "ipykernel" in sys.modules else None)


def build_config(args: argparse.Namespace) -> TrainingConfig:
    dropout = 0.2 if args.arch == "mobilenet_v3_large" else 0.3
    env_extra_roots = parse_extra_dataset_roots(os.environ.get("PLANTIFY_EXTRA_DATASETS"))
    cli_extra_roots = args.extra_dataset_roots or []
    return TrainingConfig(
        dataset_root=args.dataset_root,
        extra_dataset_roots=[*env_extra_roots, *cli_extra_roots],
        extra_dataset_tomato_only=args.extra_dataset_tomato_only or parse_env_flag(os.environ.get("PLANTIFY_EXTRA_DATASETS_TOMATO_ONLY")),
        checkpoint_path=args.checkpoint_path,
        classes_path=args.classes_path,
        arch=args.arch,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        workers=args.workers,
        scheduler="onecycle",
        tta_runs=2,
        use_ema=True,
        ema_decay=0.999,
        resume=args.resume,
        dropout=dropout,
    )


def main() -> None:
    args = parse_args()
    train_model(build_config(args))


if __name__ == "__main__":
    main()
