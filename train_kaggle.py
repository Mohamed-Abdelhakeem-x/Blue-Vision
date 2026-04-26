from __future__ import annotations

import argparse
import copy
from contextlib import nullcontext
import importlib.metadata
import json
import os
import random
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np

_TORCH_BOOTSTRAP_FLAG = "BLUEVISION_TORCH_BOOTSTRAPPED"
_GPU_ONLY_ERROR = "No compatible NVIDIA GPU runtime is available. CPU fallback is disabled for this Kaggle profile."


def _detect_gpu_names() -> list[str]:
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            check=True,
            capture_output=True,
            text=True,
        )
    except Exception:
        return []
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def _desired_torch_packages(gpu_names: list[str]) -> tuple[list[str], str] | None:
    if not gpu_names:
        return None
    if any("P100" in name.upper() for name in gpu_names):
        return (
            ["numpy==1.26.4", "torch==2.2.2", "torchvision==0.17.2", "torchaudio==2.2.2"],
            "https://download.pytorch.org/whl/cu118",
        )
    return None


def _torch_versions_match(packages: list[str]) -> bool:
    for package in packages:
        name, expected_version = package.split("==", maxsplit=1)
        try:
            installed_version = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            return False
        if installed_version != expected_version:
            return False
    return True


def _restart_after_bootstrap() -> None:
    os.environ[_TORCH_BOOTSTRAP_FLAG] = "1"
    if "__file__" in globals():
        os.execv(sys.executable, [sys.executable, str(Path(__file__).resolve()), *sys.argv[1:]])
    raise RuntimeError(
        "PyTorch was reinstalled for this GPU. Re-run the notebook cell once, or execute %run train_kaggle.py for full auto-restart."
    )


def bootstrap_torch_for_gpu() -> None:
    if os.environ.get(_TORCH_BOOTSTRAP_FLAG) == "1":
        return
    gpu_names = _detect_gpu_names()
    if not gpu_names:
        raise RuntimeError(_GPU_ONLY_ERROR)
    desired = _desired_torch_packages(gpu_names)
    if desired is None:
        return
    packages, index_url = desired
    if _torch_versions_match(packages):
        return
    print(f"[bootstrap] Detected GPU(s): {', '.join(gpu_names)}")
    print(f"[bootstrap] Installing a Pascal-compatible PyTorch build from {index_url}")
    subprocess.check_call(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--no-cache-dir",
            "--upgrade",
            *packages,
            "--index-url",
            index_url,
        ]
    )
    _restart_after_bootstrap()


bootstrap_torch_for_gpu()

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
    arch: str = "efficientnet_b3"
    epochs: int = 22
    batch_size: int = 40
    lr: float = 5e-4
    weight_decay: float = 1e-2
    val_split: float = 0.18
    workers: int = 8
    image_size: int = 240
    seed: int = 42
    mixup_alpha: float = 0.25
    freeze_backbone_epochs: int = 2
    patience: int = 6
    min_delta: float = 1e-3
    use_ema: bool = True
    ema_decay: float = 0.999
    tta_runs: int = 2
    scheduler: str = "onecycle"
    randaugment_ops: int = 3
    randaugment_magnitude: int = 8
    random_erasing_p: float = 0.3
    random_erasing_scale: tuple[float, float] = (0.02, 0.14)
    dropout: float = 0.35
    resume: bool = False
    pin_memory: bool | None = None
    eval_every: int = 1


class BlueVisionDataset(Dataset):
    def __init__(self, samples: list[tuple[Path, int]], transform: transforms.Compose) -> None:
        self.samples = samples
        self.transform = transform

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, int]:
        path, label = self.samples[index]
        image = Image.open(path).convert("RGB")
        return self.transform(image), label


class PILToFloatTensor:
    def __call__(self, image: Image.Image) -> torch.Tensor:
        if image.mode != "RGB":
            image = image.convert("RGB")
        width, height = image.size
        buffer = bytearray(image.tobytes())
        tensor = torch.frombuffer(buffer, dtype=torch.uint8)
        tensor = tensor.view(height, width, 3).permute(2, 0, 1).contiguous()
        return tensor.to(dtype=torch.float32).div_(255.0)


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
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def _cuda_arch_supported() -> bool:
    if not torch.cuda.is_available():
        return False
    get_arch_list = getattr(torch.cuda, "get_arch_list", None)
    if get_arch_list is None:
        return True
    supported_arches = set(get_arch_list())
    if not supported_arches:
        return True
    for index in range(torch.cuda.device_count()):
        major, minor = torch.cuda.get_device_capability(index)
        arch_name = f"sm_{major}{minor}"
        if arch_name not in supported_arches:
            device_name = torch.cuda.get_device_name(index)
            print(
                f"[device] CUDA device '{device_name}' exposes {arch_name}, but this PyTorch build supports "
                f"{', '.join(sorted(supported_arches))}."
            )
            return False
    return True


def resolve_device() -> torch.device:
    if not torch.cuda.is_available():
        raise RuntimeError(_GPU_ONLY_ERROR)
    if not _cuda_arch_supported():
        raise RuntimeError(
            "The installed PyTorch build is still incompatible with the active GPU. "
            "Restart the runtime after bootstrap or switch Kaggle to a T4 accelerator."
        )
    return torch.device("cuda")


def running_in_notebook() -> bool:
    return "ipykernel" in sys.modules or Path("/kaggle").exists()


def configure_cpu_runtime(requested_workers: int, gpu_count: int = 0) -> tuple[int, int]:
    cpu_count = os.cpu_count() or 2
    if running_in_notebook():
        gpu_name = torch.cuda.get_device_name(0).upper() if torch.cuda.is_available() else ""
        if "P100" in gpu_name:
            train_workers = max(1, min(requested_workers, 2))
            torch_threads = max(1, min(2, cpu_count // 2))
        elif gpu_count > 1:
            train_workers = max(2, min(requested_workers, min(4, max(2, cpu_count - 1))))
            torch_threads = max(1, min(3, cpu_count // 2))
        else:
            train_workers = max(1, min(requested_workers, 2))
            torch_threads = max(1, min(2, cpu_count // 2))
    else:
        train_workers = max(1, min(requested_workers, cpu_count))
        torch_threads = max(1, min(4, cpu_count))
    try:
        torch.set_num_threads(torch_threads)
    except RuntimeError:
        torch_threads = torch.get_num_threads()
    if hasattr(torch, "set_num_interop_threads"):
        try:
            torch.set_num_interop_threads(1)
        except RuntimeError:
            pass
    return train_workers, torch_threads


def create_grad_scaler(device: torch.device):
    if device.type != "cuda":
        return None
    amp_namespace = getattr(torch, "amp", None)
    if amp_namespace is not None and hasattr(amp_namespace, "GradScaler"):
        try:
            return amp_namespace.GradScaler("cuda")
        except TypeError:
            return amp_namespace.GradScaler()
    cuda_amp = getattr(torch.cuda, "amp", None)
    if cuda_amp is not None and hasattr(cuda_amp, "GradScaler"):
        return cuda_amp.GradScaler()
    return None


def amp_autocast(device: torch.device):
    if device.type != "cuda":
        return nullcontext()
    amp_namespace = getattr(torch, "amp", None)
    if amp_namespace is not None and hasattr(amp_namespace, "autocast"):
        try:
            return amp_namespace.autocast("cuda", dtype=torch.float16)
        except TypeError:
            return amp_namespace.autocast(device_type="cuda", dtype=torch.float16)
    if hasattr(torch, "autocast"):
        try:
            return torch.autocast(device_type="cuda", dtype=torch.float16)
        except TypeError:
            return torch.autocast("cuda", dtype=torch.float16)
    cuda_amp = getattr(torch.cuda, "amp", None)
    if cuda_amp is not None and hasattr(cuda_amp, "autocast"):
        return cuda_amp.autocast(dtype=torch.float16)
    return nullcontext()


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

    if arch_lower == "efficientnet_b2":
        weights = models.EfficientNet_B2_Weights.IMAGENET1K_V1 if pretrained else None
        model = models.efficientnet_b2(weights=weights)
        in_features = model.classifier[1].in_features
        model.classifier[1] = nn.Sequential(nn.Dropout(dropout), nn.Linear(in_features, num_classes))
        return model

    weights = models.EfficientNet_B3_Weights.IMAGENET1K_V1 if pretrained else None
    model = models.efficientnet_b3(weights=weights)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Sequential(nn.Dropout(dropout), nn.Linear(in_features, num_classes))
    return model


def set_backbone_trainable(model: nn.Module, trainable: bool) -> None:
    for parameter in model.features.parameters():
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
            inputs = inputs.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)
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
    fast_profile = config.image_size <= 224
    train_ops: list[object] = [
        transforms.RandomResizedCrop(
            config.image_size,
            scale=(0.80, 1.0) if fast_profile else (0.68, 1.0),
            ratio=(0.9, 1.1) if fast_profile else (0.8, 1.2),
        ),
        transforms.RandomHorizontalFlip(),
    ]
    if config.randaugment_ops > 0:
        train_ops.append(transforms.RandAugment(num_ops=config.randaugment_ops, magnitude=config.randaugment_magnitude))
    if not fast_profile:
        train_ops.extend(
            [
                transforms.RandomVerticalFlip(p=0.2),
                transforms.RandomRotation(18),
                transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.0),
            ]
        )
    train_ops.extend(
        [
            PILToFloatTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            transforms.RandomErasing(
                p=config.random_erasing_p,
                scale=config.random_erasing_scale,
                ratio=(0.3, 3.3),
                value="random",
            ),
        ]
    )
    train_tf = transforms.Compose(train_ops)
    val_tf = transforms.Compose(
        [
            transforms.Resize(max(256 if fast_profile else 288, config.image_size + (32 if fast_profile else 48))),
            transforms.CenterCrop(config.image_size),
            PILToFloatTensor(),
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
    arch = checkpoint.get("arch", "efficientnet_b3")
    model = build_model(arch, len(classes), dropout=0.35, pretrained=False)
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
    num_gpus = torch.cuda.device_count() if device.type == "cuda" else 0
    gpu_name = torch.cuda.get_device_name(0) if device.type == "cuda" and num_gpus > 0 else "unknown"
    if "P100" in gpu_name.upper():
        print("[profile] P100 profile active: efficientnet_b2 + batch 32 defaults")
    else:
        print(f"[profile] GPU profile active: {gpu_name}")
    pin_memory = device.type == "cuda" if config.pin_memory is None else config.pin_memory
    train_workers, torch_threads = configure_cpu_runtime(config.workers, gpu_count=num_gpus)
    val_workers = 1 if running_in_notebook() else max(1, train_workers // 2)
    if running_in_notebook() and train_workers == 0:
        val_workers = 0
    if running_in_notebook() and num_gpus > 1:
        val_workers = max(1, min(2, train_workers // 2))
    global_batch_size = config.batch_size * max(1, num_gpus)
    if device.type == "cuda":
        torch.backends.cudnn.benchmark = True

    dataset_roots = [config.dataset_root, *config.extra_dataset_roots]
    raw_samples, classes = collect_samples(dataset_roots, extra_dataset_tomato_only=config.extra_dataset_tomato_only)
    class_to_idx = {class_name: idx for idx, class_name in enumerate(classes)}
    train_samples, val_samples = split_by_class(raw_samples, class_to_idx, config.val_split, config.seed)
    train_tf, val_tf = build_transforms(config)

    train_ds = BlueVisionDataset(train_samples, train_tf)
    val_ds = BlueVisionDataset(val_samples, val_tf)
    train_loader_kwargs = {
        "batch_size": global_batch_size,
        "sampler": build_sampler(train_samples, len(classes)),
        "num_workers": train_workers,
        "pin_memory": pin_memory,
    }
    if train_workers > 0:
        train_loader_kwargs["persistent_workers"] = True
        train_loader_kwargs["prefetch_factor"] = 4 if (running_in_notebook() and num_gpus > 1) else 2
    train_loader = DataLoader(
        train_ds,
        **train_loader_kwargs,
    )
    val_loader_kwargs = {
        "batch_size": global_batch_size,
        "shuffle": False,
        "num_workers": val_workers,
        "pin_memory": pin_memory,
    }
    if val_workers > 0:
        val_loader_kwargs["persistent_workers"] = True
        val_loader_kwargs["prefetch_factor"] = 2
    val_loader = DataLoader(
        val_ds,
        **val_loader_kwargs,
    )

    model = build_model(config.arch, len(classes), dropout=config.dropout, pretrained=True).to(device)
    if num_gpus > 1:
        print(f"[multi-GPU] Using {num_gpus} GPUs via DataParallel")
        base_model = model
        model = nn.DataParallel(model)
    else:
        base_model = model
    set_backbone_trainable(base_model, trainable=False)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = AdamW(base_model.parameters(), lr=config.lr, weight_decay=config.weight_decay)
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

    scaler = create_grad_scaler(device)
    ema = ModelEMA(base_model, decay=config.ema_decay) if config.use_ema else None

    start_epoch = 1
    best_metric = -1.0
    patience_counter = 0
    if config.resume and config.checkpoint_path.exists():
        checkpoint = torch.load(config.checkpoint_path, map_location="cpu", weights_only=False)
        base_model.load_state_dict(checkpoint.get("model_state_dict", checkpoint), strict=False)
        if ema is not None and checkpoint.get("ema_state_dict") is not None:
            ema.ema_model.load_state_dict(checkpoint["ema_state_dict"], strict=False)
        best_metric = float(checkpoint.get("val_top1", checkpoint.get("val_accuracy", -1.0)))
        start_epoch = int(checkpoint.get("epoch", 0)) + 1
        print(f"Resumed training from epoch {start_epoch}")

    print(
        f"Training {config.arch} on {device} (x{num_gpus} GPU{'s' if num_gpus > 1 else ''}) | "
        f"roots={len(dataset_roots)} train={len(train_ds)} val={len(val_ds)} | "
        f"batch={global_batch_size} (={config.batch_size}x{max(1, num_gpus)}) "
        f"workers={train_workers}/{val_workers} torch_threads={torch_threads} eval_every={config.eval_every}"
    )

    for epoch in range(start_epoch, config.epochs + 1):
        if epoch == config.freeze_backbone_epochs + 1:
            set_backbone_trainable(base_model, trainable=True)

        model.train()
        train_loss = 0.0
        for inputs, labels in train_loader:
            inputs = inputs.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            mixed_inputs, labels_a, labels_b, lam = apply_mixup(inputs, labels, config.mixup_alpha)

            if scaler is not None:
                with amp_autocast(device):
                    logits = model(mixed_inputs)
                    loss = (lam * criterion(logits, labels_a)) + ((1.0 - lam) * criterion(logits, labels_b))
                scaler.scale(loss).backward()
                scaler.unscale_(optimizer)
                nn.utils.clip_grad_norm_(base_model.parameters(), max_norm=1.0)
                scaler.step(optimizer)
                scaler.update()
            else:
                logits = model(mixed_inputs)
                loss = (lam * criterion(logits, labels_a)) + ((1.0 - lam) * criterion(logits, labels_b))
                loss.backward()
                nn.utils.clip_grad_norm_(base_model.parameters(), max_norm=1.0)
                optimizer.step()

            if ema is not None:
                ema.update(base_model)

            if config.scheduler == "onecycle":
                scheduler.step()
            train_loss += float(loss.item())

        if config.scheduler != "onecycle":
            scheduler.step()

        avg_train_loss = train_loss / max(1, len(train_loader))
        should_eval = (epoch % max(1, config.eval_every) == 0) or (epoch == config.epochs)
        if not should_eval:
            print(f"Epoch {epoch:02d}/{config.epochs} | train_loss={avg_train_loss:.4f} | val=skipped")
            continue

        eval_model = ema.ema_model if ema is not None else model
        val_metrics = evaluate(eval_model, val_loader, criterion, device, tta_runs=config.tta_runs)
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
        Path("/kaggle/input/bluevision-dataset/dataset"),
        Path("/kaggle/input/plantvillage-dataset"),
        Path("/kaggle/input/new-plant-diseases-dataset"),
    ]
    for candidate in candidates:
        found = _find_dataset_subroot(candidate)
        if found:
            return found
    download_dir = Path("/kaggle/working/downloads") if Path("/kaggle/working").exists() else repo_root / "downloads"
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
    if running_in_notebook():
        gpu_name = torch.cuda.get_device_name(0).upper() if torch.cuda.is_available() else ""
        if "P100" in gpu_name:
            return max(1, min(3, cpu_count - 1))
        gpu_count = torch.cuda.device_count() if torch.cuda.is_available() else 0
        if gpu_count > 1:
            return max(2, min(4, max(2, cpu_count - 1)))
        return max(1, min(2, cpu_count // 2 or 1))
    return max(2, min(8, cpu_count))


def default_arch() -> str:
    if torch.cuda.is_available():
        name = torch.cuda.get_device_name(0).upper()
        if "P100" in name:
            return "efficientnet_b2"
    return "efficientnet_b3"


def default_batch_size() -> int:
    if torch.cuda.is_available():
        name = torch.cuda.get_device_name(0).upper()
        if "P100" in name:
            return 96
    return 40


def default_eval_every() -> int:
    if torch.cuda.is_available():
        name = torch.cuda.get_device_name(0).upper()
        if "P100" in name:
            return 3
    return 1


def parse_args() -> argparse.Namespace:
    repo_root = Path(__file__).resolve().parent if "__file__" in dir() else Path.cwd()
    backend_model_dir = repo_root / "backend" / "model"
    parser = argparse.ArgumentParser(description="Train BlueVision in Kaggle notebooks.")
    parser.add_argument("--dataset-root", type=Path, default=resolve_dataset_root(repo_root))
    parser.add_argument("--extra-dataset-root", dest="extra_dataset_roots", action="append", type=Path, default=None)
    parser.add_argument("--checkpoint-path", type=Path, default=backend_model_dir / "bluevision_model.pth")
    parser.add_argument("--classes-path", type=Path, default=backend_model_dir / "classes.json")
    parser.add_argument("--extra-dataset-tomato-only", action="store_true")
    parser.add_argument("--arch", choices=["efficientnet_b2", "efficientnet_b3", "mobilenet_v3_large"], default=default_arch())
    parser.add_argument("--epochs", type=int, default=22)
    parser.add_argument("--batch-size", type=int, default=default_batch_size())
    parser.add_argument("--lr", type=float, default=5e-4)
    parser.add_argument("--workers", type=int, default=default_worker_count())
    parser.add_argument("--eval-every", type=int, default=default_eval_every())
    parser.add_argument("--resume", action="store_true")
    return parser.parse_args([] if "ipykernel" in sys.modules else None)


def build_config(args: argparse.Namespace) -> TrainingConfig:
    p100_profile = torch.cuda.is_available() and "P100" in torch.cuda.get_device_name(0).upper()
    if args.arch == "mobilenet_v3_large":
        dropout = 0.2
    elif args.arch == "efficientnet_b2":
        dropout = 0.3
    else:
        dropout = 0.35
    env_extra_roots = parse_extra_dataset_roots(os.environ.get("BLUEVISION_EXTRA_DATASETS"))
    cli_extra_roots = args.extra_dataset_roots or []
    return TrainingConfig(
        dataset_root=args.dataset_root,
        extra_dataset_roots=[*env_extra_roots, *cli_extra_roots],
        extra_dataset_tomato_only=args.extra_dataset_tomato_only or parse_env_flag(os.environ.get("BLUEVISION_EXTRA_DATASETS_TOMATO_ONLY")),
        checkpoint_path=args.checkpoint_path,
        classes_path=args.classes_path,
        arch=args.arch,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        workers=args.workers,
        scheduler="onecycle",
        tta_runs=1 if p100_profile else 2,
        use_ema=True,
        ema_decay=0.999,
        eval_every=max(1, int(args.eval_every)),
        resume=args.resume,
        image_size=224 if p100_profile else 240,
        randaugment_ops=0 if p100_profile else 3,
        randaugment_magnitude=0 if p100_profile else 8,
        random_erasing_p=0.08 if p100_profile else 0.3,
        val_split=0.15 if p100_profile else 0.18,
        freeze_backbone_epochs=1 if p100_profile else 2,
        dropout=dropout,
    )


def main() -> None:
    args = parse_args()
    train_model(build_config(args))


if __name__ == "__main__":
    main()
