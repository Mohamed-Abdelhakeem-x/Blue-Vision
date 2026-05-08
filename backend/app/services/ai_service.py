import json
from io import BytesIO
from pathlib import Path
from typing import Any

import numpy as np
import onnxruntime as ort
from PIL import Image


class AIService:
    def __init__(self, model_path: str, labels_path: str) -> None:
        self.model_path = Path(model_path)
        self.labels_path = Path(labels_path)
        self.session = self._load_session()
        self.labels = self._load_labels()

    def _load_session(self) -> ort.InferenceSession:
        providers = ["CPUExecutionProvider"]
        session_options = ort.SessionOptions()
        session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        return ort.InferenceSession(str(self.model_path), providers=providers, sess_options=session_options)

    def _load_labels(self) -> list[str]:
        if self.labels_path.exists():
            return json.loads(self.labels_path.read_text(encoding="utf-8"))
        return []

    @staticmethod
    def _normalize_image(image: Image.Image) -> np.ndarray:
        arr = np.asarray(image).astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)

        arr = (arr - mean) / std
        arr = np.transpose(arr, (2, 0, 1))
        return np.expand_dims(arr, axis=0)

    @staticmethod
    def _resize_preserving_aspect_ratio(image: Image.Image, min_side: int) -> Image.Image:
        width, height = image.size
        if width <= 0 or height <= 0:
            raise ValueError("Invalid image dimensions")

        if width < height:
            new_width = min_side
            new_height = int(round((height / width) * min_side))
        else:
            new_height = min_side
            new_width = int(round((width / height) * min_side))

        return image.resize((new_width, new_height), Image.Resampling.BILINEAR)

    @staticmethod
    def _center_crop(image: Image.Image, image_size: int) -> Image.Image:
        width, height = image.size
        left = max((width - image_size) // 2, 0)
        top = max((height - image_size) // 2, 0)
        return image.crop((left, top, left + image_size, top + image_size))

    @staticmethod
    def _five_crop(image: Image.Image, image_size: int) -> list[Image.Image]:
        width, height = image.size
        if width < image_size or height < image_size:
            image = image.resize((max(width, image_size), max(height, image_size)), Image.Resampling.BILINEAR)
            width, height = image.size

        x_right = width - image_size
        y_bottom = height - image_size
        x_center = max((width - image_size) // 2, 0)
        y_center = max((height - image_size) // 2, 0)

        boxes = [
            (0, 0, image_size, image_size),
            (x_right, 0, x_right + image_size, image_size),
            (0, y_bottom, image_size, y_bottom + image_size),
            (x_right, y_bottom, x_right + image_size, y_bottom + image_size),
            (x_center, y_center, x_center + image_size, y_center + image_size),
        ]
        return [image.crop(box) for box in boxes]

    @classmethod
    def preprocess(cls, image_bytes: bytes, image_size: int = 240) -> np.ndarray:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        resize_min_side = max(256, image_size + 48)
        image = cls._resize_preserving_aspect_ratio(image, resize_min_side)
        image = cls._center_crop(image, image_size)
        return cls._normalize_image(image)

    @classmethod
    def _preprocess_variants(cls, image_bytes: bytes, image_size: int = 240) -> list[np.ndarray]:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        resize_min_side = max(256, image_size + 48)
        image = cls._resize_preserving_aspect_ratio(image, resize_min_side)

        crops = cls._five_crop(image, image_size)
        center_crop = crops[-1]
        flipped_center = center_crop.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        return [cls._normalize_image(c) for c in [*crops, flipped_center]]

    @staticmethod
    def _plant_likelihood(image_bytes: bytes) -> dict[str, float]:
        image = Image.open(BytesIO(image_bytes)).convert("RGB").resize((240, 240), Image.Resampling.BILINEAR)
        arr = np.asarray(image).astype(np.float32) / 255.0

        r = arr[..., 0]
        g = arr[..., 1]
        b = arr[..., 2]

        vegetation_mask = (g > (r * 1.05)) & (g > (b * 1.05))
        vegetation_ratio = float(np.mean(vegetation_mask))
        green_dominance = float(np.mean((g > (r + 0.03)) & (g > (b + 0.03))))

        green_excess = float(np.clip(np.mean(g - ((r + b) * 0.5)), 0.0, 1.0))

        max_channel = np.max(arr, axis=2)
        min_channel = np.min(arr, axis=2)
        saturation = np.where(max_channel > 0, (max_channel - min_channel) / max_channel, 0.0)
        saturation_mean = float(np.mean(saturation))
        high_contrast_ratio = float(np.mean((max_channel - min_channel) > 0.55))

        gray_like_ratio = float(np.mean((np.abs(r - g) < 0.04) & (np.abs(g - b) < 0.04)))

        gray = (0.299 * r) + (0.587 * g) + (0.114 * b)
        edge_h = np.abs(np.diff(gray, axis=1)).mean()
        edge_v = np.abs(np.diff(gray, axis=0)).mean()
        edge_density = float(np.clip((edge_h + edge_v) * 2.5, 0.0, 1.0))

        # UI screenshots and text-heavy images usually have high contrast/edges with low vegetation.
        score = (
            (0.45 * vegetation_ratio)
            + (0.2 * green_excess)
            + (0.18 * saturation_mean)
            + (0.15 * green_dominance)
            - (0.2 * gray_like_ratio)
            - (0.12 * high_contrast_ratio)
            - (0.08 * edge_density)
        )
        plant_score = float(np.clip(score, 0.0, 1.0))
        return {
            "plant_score": plant_score,
            "vegetation_ratio": vegetation_ratio,
            "gray_ratio": gray_like_ratio,
            "high_contrast_ratio": high_contrast_ratio,
            "edge_density": edge_density,
        }

    @staticmethod
    def _prediction_stats(probs: np.ndarray) -> dict[str, float]:
        if probs.size == 0:
            return {"confidence": 0.0, "margin": 0.0, "entropy": 1.0}
        sorted_probs = np.sort(probs)
        top1 = float(sorted_probs[-1])
        top2 = float(sorted_probs[-2]) if probs.size > 1 else 0.0
        margin = top1 - top2
        eps = 1e-12
        entropy = float(-np.sum(probs * np.log(np.clip(probs, eps, 1.0))))
        entropy_max = float(np.log(max(2, probs.size)))
        normalized_entropy = float(entropy / entropy_max) if entropy_max > 0 else 1.0
        return {"confidence": top1, "margin": margin, "entropy": normalized_entropy}

    def _top_predictions(self, probs: np.ndarray, limit: int = 3) -> list[dict[str, float | int | str]]:
        if probs.size == 0:
            return []

        top_indices = np.argsort(probs)[::-1][: max(1, limit)]
        predictions: list[dict[str, float | int | str]] = []
        for idx in top_indices:
            index = int(idx)
            label = self.labels[index] if self.labels and index < len(self.labels) else f"class_{index}"
            predictions.append(
                {
                    "index": index,
                    "label": label,
                    "confidence": float(probs[index]),
                }
            )
        return predictions

    @staticmethod
    def _variant_consensus(variant_probs: list[np.ndarray], predicted_index: int) -> float:
        if not variant_probs:
            return 0.0

        votes = 0
        confidence_sum = 0.0
        for probs in variant_probs:
            if probs.size == 0:
                continue
            vote_index = int(np.argmax(probs))
            if vote_index == predicted_index:
                votes += 1
            confidence_sum += float(probs[predicted_index])

        vote_ratio = votes / len(variant_probs)
        mean_support = confidence_sum / len(variant_probs)
        return float(np.clip((0.65 * vote_ratio) + (0.35 * mean_support), 0.0, 1.0))

    @staticmethod
    def _calibrate_confidence(
        *, raw_confidence: float, margin: float, entropy: float, plant_score: float, consensus: float
    ) -> float:
        margin_score = float(np.clip(margin / 0.35, 0.0, 1.0))
        entropy_score = 1.0 - float(np.clip(entropy, 0.0, 1.0))
        plant_score = float(np.clip(plant_score, 0.0, 1.0))
        consensus = float(np.clip(consensus, 0.0, 1.0))

        calibrated = (
            (0.5 * raw_confidence)
            + (0.2 * margin_score)
            + (0.15 * entropy_score)
            + (0.1 * consensus)
            + (0.05 * plant_score)
        )
        return float(np.clip(calibrated, 0.0, 0.995))

    def predict(self, image_bytes: bytes) -> dict[str, Any]:
        input_name = self.session.get_inputs()[0].name
        output_name = self.session.get_outputs()[0].name

        variant_tensors = self._preprocess_variants(image_bytes)
        variant_logits: list[np.ndarray] = []
        for input_tensor in variant_tensors:
            logits = self.session.run([output_name], {input_name: input_tensor})[0][0]
            variant_logits.append(logits.astype(np.float32))

        avg_logits = np.mean(np.stack(variant_logits, axis=0), axis=0)
        probs = self._softmax(avg_logits)
        stats = self._prediction_stats(probs)
        variant_probs = [self._softmax(logits) for logits in variant_logits]
        top_predictions = self._top_predictions(probs, limit=3)

        index = int(np.argmax(probs))
        raw_confidence = float(probs[index])
        label = self.labels[index] if self.labels and index < len(self.labels) else f"class_{index}"
        
        # Mocking the label to return a valid Tilapia health status for UI testing
        label = "Nile Tilapia___healthy"
        plant_features = self._plant_likelihood(image_bytes)
        plant_score = float(plant_features["plant_score"])
        margin = float(stats["margin"])
        entropy = float(stats["entropy"])
        consensus = self._variant_consensus(variant_probs, index)
        confidence = self._calibrate_confidence(
            raw_confidence=raw_confidence,
            margin=margin,
            entropy=entropy,
            plant_score=plant_score,
            consensus=consensus,
        )
        is_uncertain = False # Mocked to prevent rejecting fish images
        is_low_confidence = False # Mocked

        # Keep a non-plant filter, but let a reasonably confident disease signal
        # override weak color heuristics so real plant photos are not rejected.
        weak_plant_signal = plant_score < 0.08
        very_low_leaf_texture = plant_features["vegetation_ratio"] < 0.03
        mostly_gray = plant_features["gray_ratio"] > 0.60
        strong_model_signal = raw_confidence >= 0.30 or margin >= 0.08

        is_plant = plant_score >= 0.10 or (strong_model_signal and entropy < 0.92)
        if weak_plant_signal and raw_confidence < 0.25 and margin < 0.05:
            is_plant = False
        if mostly_gray and very_low_leaf_texture and raw_confidence < 0.28:
            is_plant = False

        analysis_note = None
        if is_low_confidence:
            analysis_note = (
                "This scan is plausible but not very stable. "
                "Review the top alternatives and, if possible, scan a closer image of one plant."
            )

        return {
            "index": index,
            "label": label,
            "confidence": confidence,
            "raw_confidence": raw_confidence,
            "fish_score": plant_score,
            "margin": margin,
            "entropy": entropy,
            "consensus": consensus,
            "is_fish": True, # Mocked as requested
            "is_uncertain": is_uncertain,
            "is_low_confidence": is_low_confidence,
            "top_predictions": top_predictions,
            "analysis_note": analysis_note,
        }

    @staticmethod
    def _softmax(logits: np.ndarray) -> np.ndarray:
        shifted = logits - np.max(logits)
        exp = np.exp(shifted)
        return exp / np.sum(exp)
