from pathlib import Path
import sys

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def _write_image(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (32, 32), (40, 180, 90))
    image.save(path, format="PNG")


def test_collect_samples_merges_multiple_roots_without_duplicates(tmp_path):
    from train import collect_samples

    root_a = tmp_path / "dataset_a"
    root_b = tmp_path / "dataset_b"

    _write_image(root_a / "color" / "Tomato___healthy" / "a.png")
    _write_image(root_b / "train" / "Potato___Late_blight" / "b.png")

    samples, classes = collect_samples([root_a, root_b])

    assert len(samples) == 2
    assert classes == ["Potato___Late_blight", "Tomato___healthy"]


def test_collect_samples_can_limit_extra_roots_to_tomato_only(tmp_path):
    from train import collect_samples

    root_a = tmp_path / "dataset_a"
    root_b = tmp_path / "dataset_b"

    _write_image(root_a / "color" / "Apple___healthy" / "a.png")
    _write_image(root_b / "train" / "Tomato___Bacterial_spot" / "b.png")
    _write_image(root_b / "train" / "Potato___Late_blight" / "c.png")

    samples, classes = collect_samples([root_a, root_b], extra_dataset_tomato_only=True)

    assert len(samples) == 2
    assert classes == ["Apple___healthy", "Tomato___Bacterial_spot"]
