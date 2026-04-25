from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps


IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
DOMAIN_DIRS = ("color", "grayscale", "segmented", "train")


def is_tomato_class(class_name: str) -> bool:
    normalized = class_name.strip().lower().replace("-", "_").replace(" ", "_")
    return normalized.startswith("tomato___") or normalized.startswith("tomato_")


def iter_tomato_images(dataset_root: Path) -> list[tuple[Path, str]]:
    samples: list[tuple[Path, str]] = []
    for domain_dir_name in DOMAIN_DIRS:
        domain_dir = dataset_root / domain_dir_name
        if not domain_dir.exists():
            continue
        for class_dir in sorted(path for path in domain_dir.iterdir() if path.is_dir()):
            if not is_tomato_class(class_dir.name):
                continue
            for image_path in class_dir.glob("**/*"):
                if image_path.suffix.lower() in IMAGE_SUFFIXES:
                    samples.append((image_path, class_dir.name))
    return samples


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def average_hash(path: Path, *, hash_size: int = 16) -> str:
    image = Image.open(path).convert("RGB")
    image = ImageOps.exif_transpose(image)
    image = image.resize((hash_size, hash_size), Image.Resampling.BILINEAR).convert("L")
    pixels = list(image.tobytes())
    mean = sum(pixels) / max(1, len(pixels))
    bits = "".join("1" if value >= mean else "0" for value in pixels)
    return hex(int(bits, 2))[2:].zfill((hash_size * hash_size) // 4)


def hamming_distance(hash_a: str, hash_b: str) -> int:
    bits_a = bin(int(hash_a, 16))[2:].zfill(len(hash_a) * 4)
    bits_b = bin(int(hash_b, 16))[2:].zfill(len(hash_b) * 4)
    return sum(char_a != char_b for char_a, char_b in zip(bits_a, bits_b))


@dataclass
class DedupRecord:
    source_path: str
    class_name: str
    duplicate_of: str | None
    duplicate_reason: str | None
    copied_to: str | None


def prepare_dataset(
    *,
    source_roots: list[Path],
    output_root: Path,
    perceptual_threshold: int,
) -> dict:
    output_root.mkdir(parents=True, exist_ok=True)

    exact_hashes: dict[str, Path] = {}
    perceptual_hashes: list[tuple[str, Path]] = []
    records: list[DedupRecord] = []
    copied = 0
    duplicates = 0
    scanned = 0

    for source_root in source_roots:
        for image_path, class_name in iter_tomato_images(source_root):
            scanned += 1
            file_hash = sha256_file(image_path)
            if file_hash in exact_hashes:
                duplicates += 1
                records.append(
                    DedupRecord(
                        source_path=str(image_path),
                        class_name=class_name,
                        duplicate_of=str(exact_hashes[file_hash]),
                        duplicate_reason="exact_sha256",
                        copied_to=None,
                    )
                )
                continue

            image_hash = average_hash(image_path)
            near_duplicate: Path | None = None
            for known_hash, known_path in perceptual_hashes:
                if hamming_distance(image_hash, known_hash) <= perceptual_threshold:
                    near_duplicate = known_path
                    break
            if near_duplicate is not None:
                duplicates += 1
                records.append(
                    DedupRecord(
                        source_path=str(image_path),
                        class_name=class_name,
                        duplicate_of=str(near_duplicate),
                        duplicate_reason=f"perceptual_hash<=${perceptual_threshold}".replace("$", ""),
                        copied_to=None,
                    )
                )
                continue

            class_dir = output_root / "train" / class_name
            class_dir.mkdir(parents=True, exist_ok=True)
            destination = class_dir / f"{image_path.stem}_{copied:06d}{image_path.suffix.lower()}"
            shutil.copy2(image_path, destination)

            exact_hashes[file_hash] = destination
            perceptual_hashes.append((image_hash, destination))
            copied += 1
            records.append(
                DedupRecord(
                    source_path=str(image_path),
                    class_name=class_name,
                    duplicate_of=None,
                    duplicate_reason=None,
                    copied_to=str(destination),
                )
            )

    summary = {
        "source_roots": [str(path) for path in source_roots],
        "output_root": str(output_root),
        "scanned_images": scanned,
        "copied_images": copied,
        "duplicates_removed": duplicates,
        "perceptual_threshold": perceptual_threshold,
        "classes": sorted({record.class_name for record in records if record.copied_to}),
        "records": [record.__dict__ for record in records],
    }
    return summary


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Merge tomato-only datasets and remove duplicates before training.")
    parser.add_argument("--source-root", dest="source_roots", action="append", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--report-path", type=Path, default=Path("backend/model/tomato_dataset_report.json"))
    parser.add_argument("--perceptual-threshold", type=int, default=4)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    summary = prepare_dataset(
        source_roots=args.source_roots,
        output_root=args.output_root,
        perceptual_threshold=max(0, int(args.perceptual_threshold)),
    )
    args.report_path.parent.mkdir(parents=True, exist_ok=True)
    args.report_path.write_text(json.dumps(summary, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in summary.items() if k != "records"}, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
