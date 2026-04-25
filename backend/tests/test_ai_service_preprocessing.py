from io import BytesIO

from PIL import Image

from app.services.ai_service import AIService


def _image_bytes(size: tuple[int, int]) -> bytes:
    image = Image.new("RGB", size, (80, 140, 60))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_preprocess_returns_model_ready_tensor_shape():
    tensor = AIService.preprocess(_image_bytes((1200, 600)))
    assert tensor.shape == (1, 3, 240, 240)


def test_preprocess_variants_returns_expected_tta_count():
    variants = AIService._preprocess_variants(_image_bytes((500, 1000)))
    assert len(variants) == 6
    assert all(variant.shape == (1, 3, 240, 240) for variant in variants)


def test_resize_preserving_aspect_ratio_keeps_shortest_side_target():
    image = Image.new("RGB", (1200, 600), (120, 200, 90))
    resized = AIService._resize_preserving_aspect_ratio(image, 288)
    assert resized.size == (576, 288)
