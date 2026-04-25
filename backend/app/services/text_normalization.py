"""Lightweight multilingual text normalization for user-authored community posts."""

import re
import unicodedata

from app.services.language_utils import detect_language


_ARABIC_CHAR_MAP = str.maketrans(
    {
        "أ": "ا",
        "إ": "ا",
        "آ": "ا",
        "ٱ": "ا",
        "ى": "ي",
        "ؤ": "و",
        "ئ": "ي",
        "ـ": "",
    }
)


def _collapse_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_user_text(text: str, *, field: str = "body") -> str:
    value = unicodedata.normalize("NFKC", text or "")
    value = value.replace("_", " ").replace("،", ", ").replace("؛", "; ").replace("?", "? ").replace("؟", "؟ ")
    value = _collapse_spaces(value)
    if not value:
        return ""

    language = detect_language(value)
    if language == "ar":
        value = value.translate(_ARABIC_CHAR_MAP)
        value = _collapse_spaces(value)
        return value

    value = re.sub(r"\s*([,;:.!?])\s*", r"\1 ", value)
    value = _collapse_spaces(value)

    if field == "plant_name":
        return value.title()

    return value[:1].upper() + value[1:] if value else value
