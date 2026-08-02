"""
AI Response Validator — ensures Gemini / Ollama output meets required schema
before it is stored or broadcast.
"""
from __future__ import annotations
import json
import re

REQUIRED_INCIDENT_KEYS = {
    "incident":        {"type", "severity", "confidence"},
    "analysis":        {"cause", "spread_risk"},
    "public_advisory": {"title", "message", "priority"},
    "responders":      None,   # must be a list
}

VALID_SEVERITIES = {"Low", "Medium", "High", "Critical"}
VALID_PRIORITIES = {"Informational", "Advisory", "Urgent", "Immediate"}


class ValidationError(Exception):
    pass


def _extract_json(text: str) -> dict:
    """Strip markdown fences and parse JSON from AI response."""
    # Remove ```json ... ``` fences
    text = re.sub(r"```(?:json)?", "", text).strip().rstrip("`").strip()
    return json.loads(text)


def validate_incident_response(raw: str) -> dict:
    """
    Parse and validate a raw AI incident analysis response.
    Raises ValidationError with a clear message on failure.
    Returns the parsed dict on success.
    """
    try:
        data = _extract_json(raw)
    except json.JSONDecodeError as e:
        raise ValidationError(f"Invalid JSON: {e}")

    # Check top-level keys
    for key, sub_keys in REQUIRED_INCIDENT_KEYS.items():
        if key not in data:
            raise ValidationError(f"Missing required key: '{key}'")
        if sub_keys:
            for sub in sub_keys:
                if sub not in data[key]:
                    raise ValidationError(f"Missing '{key}.{sub}'")

    # Validate severity
    severity = data["incident"].get("severity", "")
    if severity not in VALID_SEVERITIES:
        raise ValidationError(
            f"Invalid severity '{severity}'. Must be one of {VALID_SEVERITIES}"
        )

    # Validate confidence is 0–100
    confidence = data["incident"].get("confidence", -1)
    if not (0 <= int(confidence) <= 100):
        raise ValidationError(f"Confidence {confidence} out of range [0, 100]")

    # Validate priority
    priority = data["public_advisory"].get("priority", "")
    if priority not in VALID_PRIORITIES:
        raise ValidationError(
            f"Invalid priority '{priority}'. Must be one of {VALID_PRIORITIES}"
        )

    # Validate responders is a list
    if not isinstance(data.get("responders"), list):
        raise ValidationError("'responders' must be a list")

    return data
