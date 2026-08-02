"""
Ollama local LLM client — fallback when all Gemini keys are exhausted.
Targets Qwen2.5 (0.5B) running on localhost.
"""
from __future__ import annotations
import httpx
from config import OLLAMA_BASE_URL, OLLAMA_MODEL


async def generate(system_prompt: str, user_message: str, require_json: bool = False) -> str:
    """
    Call the local Ollama /api/chat endpoint.
    Only forces JSON format if require_json is True.
    """
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ],
        "stream": False,
        "options": {
            "temperature": 0.1 if require_json else 0.7,
            "num_predict": 512,
        },
    }

    if require_json:
        payload["format"] = "json"

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"]
