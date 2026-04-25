from pathlib import Path

from PIL import Image

from scripts.prepare_tomato_dataset import is_tomato_class, prepare_dataset


def _write_image(path: Path, color: tuple[int, int, int]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (48, 48), color)
    image.save(path, format="PNG")


def test_is_tomato_class_matches_expected_names():
    assert is_tomato_class("Tomato___healthy") is True
    assert is_tomato_class("Tomato_Bacterial_spot") is True
    assert is_tomato_class("Potato___Late_blight") is False


def test_prepare_dataset_keeps_only_tomato_and_removes_exact_duplicates(tmp_path: Path):
    source_a = tmp_path / "source_a"
    source_b = tmp_path / "source_b"
    output_root = tmp_path / "prepared"

    _write_image(source_a / "train" / "Tomato___healthy" / "a.png", (20, 160, 40))
    shutil_source = source_b / "train" / "Tomato___healthy" / "a_copy.png"
    shutil_source.parent.mkdir(parents=True, exist_ok=True)
    shutil_source.write_bytes((source_a / "train" / "Tomato___healthy" / "a.png").read_bytes())
    _write_image(source_b / "train" / "Potato___Late_blight" / "b.png", (180, 40, 20))

    summary = prepare_dataset(
        source_roots=[source_a, source_b],
        output_root=output_root,
        perceptual_threshold=0,
    )

    assert summary["copied_images"] == 1
    assert summary["duplicates_removed"] == 1
    assert summary["classes"] == ["Tomato___healthy"]
