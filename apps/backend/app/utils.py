"""Shared utility functions used across routers and services."""

import json
import logging
import re
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Prompt injection sanitisation patterns (LLM-011)
# --------------------------------------------------------------------------- #
INJECTION_PATTERNS: list[str] = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"disregard\s+(all\s+)?above",
    r"forget\s+(everything|all)",
    r"new\s+instructions?:",
    r"system\s*:",
    r"<\s*/?\s*system\s*>",
    r"\[\s*INST\s*\]",
    r"\[\s*/\s*INST\s*\]",
]


def sanitize_user_input(text: str) -> str:
    """Sanitize user input to prevent prompt injection.

    Removes or redacts common injection patterns that could
    manipulate LLM behavior.
    """
    sanitized = text
    for pattern in INJECTION_PATTERNS:
        sanitized = re.sub(pattern, "[REDACTED]", sanitized, flags=re.IGNORECASE)
    return sanitized


# --------------------------------------------------------------------------- #
# Content language resolution
# --------------------------------------------------------------------------- #
def get_content_language() -> str:
    """Get content language from stored config.json.

    Centralised helper so all routers use the same lookup logic:
    ``content_language`` → legacy ``language`` field → ``"en"``.
    """
    config_path = settings.config_path
    try:
        if config_path.exists():
            config = json.loads(config_path.read_text())
            return config.get("content_language", config.get("language", "en"))
    except (OSError, json.JSONDecodeError) as e:
        logger.warning("Failed to read content language from config: %s", e)
    return "en"
