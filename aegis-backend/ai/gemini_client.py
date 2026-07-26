"""
Gemini API client with async support.
"""
from __future__ import annotations
import asyncio
import google.generativeai as genai
from config import GEMINI_MODEL


async def generate(api_key: str, system_prompt: str, user_message: str) -> str:
    """
    Call Gemini asynchronously using the provided API key.
    Raises google.api_core.exceptions.ResourceExhausted on quota hit.
    """
    loop = asyncio.get_event_loop()

    def _sync_call() -> str:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=system_prompt,
        )
        response = model.generate_content(user_message)
        return response.text

    return await loop.run_in_executor(None, _sync_call)
