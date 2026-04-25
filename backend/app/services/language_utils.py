"""Language detection and localization utilities."""

import re
from typing import Literal

from langdetect import detect, DetectorFactory, LangDetectException


# Set seed for deterministic results
DetectorFactory.seed = 0


def detect_language(text: str) -> Literal["en", "ar", "en"]:
    """
    Detect whether the text is in English or Arabic.
    Falls back to English if detection fails.
    
    Args:
        text: Input text to detect language from
        
    Returns:
        Language code: "en" for English, "ar" for Arabic
    """
    try:
        # Quick check for Arabic script
        if re.search(r'[\u0600-\u06FF]', text):
            return "ar"
        
        # Quick check for English/Latin script
        if re.search(r'[a-zA-Z]', text):
            return "en"
        
        # Fallback to langdetect if no script detected
        detected = detect(text.strip())
        if detected.startswith('ar'):
            return "ar"
        return "en"
    except (LangDetectException, AttributeError):
        # Default to English if detection fails
        return "en"


def get_language_name(lang_code: str) -> str:
    """Get human-readable language name."""
    names = {"en": "English", "ar": "العربية"}
    return names.get(lang_code, "English")


def is_right_to_left(lang_code: str) -> bool:
    """Check if language uses right-to-left script."""
    return lang_code == "ar"
