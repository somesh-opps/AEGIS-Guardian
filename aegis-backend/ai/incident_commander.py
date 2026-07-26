"""
AI Incident Commander — orchestrates two AI modes:
  1. analyze_incident()  → triggered by event detection, returns structured dict
  2. answer_question()   → triggered by user chat, returns plain text
"""
from __future__ import annotations
import json
import logging
from db.models import IncidentPackage
from ai.router import router
from ai.prompts import INCIDENT_ANALYSIS_SYSTEM, CHATBOT_SYSTEM
from core.validator import validate_incident_response, ValidationError
from config import AI_MAX_RETRIES

logger = logging.getLogger("aegis.commander")


# ──────────────────────────────────────────────────────────────
# Mode 1 — Incident Analysis
# ──────────────────────────────────────────────────────────────
async def analyze_incident(package: IncidentPackage) -> tuple[dict, str]:
    """
    Send the incident package to the AI and get a validated structured analysis.

    Returns:
        (analysis_dict, source)  where source is "gemini" or "ollama"

    Raises:
        RuntimeError if all retries fail.
    """
    user_message = (
        "Analyze the following incident package and respond with JSON only.\n\n"
        + json.dumps(package.model_dump(), indent=2, default=str)
    )

    last_error: str = ""
    for attempt in range(1, AI_MAX_RETRIES + 2):   # +2 so we get AI_MAX_RETRIES retries
        try:
            raw = await router.generate(INCIDENT_ANALYSIS_SYSTEM, user_message, require_json=True)
            analysis = validate_incident_response(raw)
            logger.info(f"[COMMANDER] Incident analysis OK on attempt {attempt}")
            return analysis, router.last_source

        except ValidationError as ve:
            last_error = str(ve)
            logger.warning(f"[COMMANDER] Validation failed (attempt {attempt}): {ve}")
            if attempt <= AI_MAX_RETRIES:
                # Add validation feedback to prompt for retry
                user_message = (
                    f"Your previous response was invalid: {ve}\n"
                    "Analyze the following incident package and respond with JSON only.\n\n"
                    + json.dumps(package.model_dump(), indent=2, default=str)
                )
        except RuntimeError as e:
            raise

    raise RuntimeError(
        f"AI incident analysis failed after {AI_MAX_RETRIES + 1} attempts. "
        f"Last error: {last_error}"
    )


# ──────────────────────────────────────────────────────────────
# Mode 2 — Chatbot Q&A
# ──────────────────────────────────────────────────────────────
async def answer_question(
    question: str,
    campus_status: list[dict],
    active_incident: dict | None,
    chat_history: list[dict],
) -> tuple[str, str]:
    """
    Answer a user question using campus context.

    Returns:
        (answer_text, source)
    """
    # Build context string
    status_lines = "\n".join(
        f"- {b.get('building', 'Unknown')}: {b.get('status', 'SAFE')} "
        f"(people inside: {b.get('people_inside', 'unknown')})"
        for b in campus_status
    )

    incident_text = "No active incidents." if not active_incident else (
        f"ACTIVE INCIDENT — {active_incident.get('incident_type', 'Unknown')} "
        f"at {active_incident.get('building', 'Unknown')} "
        f"Floor {active_incident.get('floor', '?')}.\n"
        f"AI Analysis: {json.dumps(active_incident.get('ai_analysis', {}), indent=2)}"
    )

    history_text = ""
    if chat_history:
        history_text = "\n".join(
            f"{turn['role'].upper()}: {turn['content']}"
            for turn in chat_history
        )

    user_message = (
        f"CAMPUS STATUS:\n{status_lines}\n\n"
        f"INCIDENT STATUS:\n{incident_text}\n\n"
        f"CONVERSATION HISTORY:\n{history_text if history_text else 'None'}\n\n"
        f"USER QUESTION: {question}"
    )

    answer = await router.generate(CHATBOT_SYSTEM, user_message)
    return answer.strip(), router.last_source
