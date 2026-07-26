"""
AI Router — manages 17 Gemini API keys in round-robin with per-key
rate-limit tracking, and falls back to Ollama (Qwen2.5 0.5B) when exhausted.
"""
from __future__ import annotations
import time
import logging
from config import GEMINI_API_KEYS
import ai.gemini_client as gemini
import ai.ollama_client as ollama

logger = logging.getLogger("aegis.router")

# Cooldown in seconds after a quota/rate-limit error on a key
KEY_COOLDOWN_SECONDS = 60


class _KeyState:
    def __init__(self, key: str) -> None:
        self.key = key
        self._exhausted_until: float = 0.0

    @property
    def available(self) -> bool:
        return time.monotonic() > self._exhausted_until

    def mark_exhausted(self, seconds: int = KEY_COOLDOWN_SECONDS) -> None:
        self._exhausted_until = time.monotonic() + seconds
        logger.warning(f"[ROUTER] Key …{self.key[-6:]} exhausted — cooling for {seconds}s")


class AIRouter:
    """Singleton AI Router shared across the FastAPI app."""

    def __init__(self) -> None:
        self._keys: list[_KeyState] = [_KeyState(k) for k in GEMINI_API_KEYS]
        self._idx: int = 0
        self.last_source: str = "none"

    def _next_available_key(self) -> _KeyState | None:
        """Round-robin through keys, returning the first available one."""
        n = len(self._keys)
        for _ in range(n):
            state = self._keys[self._idx % n]
            self._idx += 1
            if state.available:
                return state
        return None

    async def generate(self, system_prompt: str, user_message: str, require_json: bool = False) -> str:
        """
        Try Gemini keys in round-robin order.
        Fall back to Ollama if all keys are exhausted or fail.
        Returns the AI response text.
        """
        # ── Try Gemini keys ────────────────────────────────────
        for attempt in range(len(self._keys)):
            key_state = self._next_available_key()
            if key_state is None:
                break   # all keys exhausted → go to Ollama

            try:
                result = await gemini.generate(key_state.key, system_prompt, user_message)
                self.last_source = "gemini"
                logger.info(f"[ROUTER] Gemini key …{key_state.key[-6:]} succeeded")
                return result
            except Exception as e:
                err = str(e).lower()
                if any(x in err for x in ("quota", "rate", "429", "resource exhausted")):
                    key_state.mark_exhausted()
                    continue   # try next key
                # Non-quota error — log and try next key
                logger.error(f"[ROUTER] Gemini error: {e}")
                continue

        # ── Fallback: Ollama ───────────────────────────────────
        logger.warning("[ROUTER] All Gemini keys exhausted — using Ollama fallback")
        try:
            result = await ollama.generate(system_prompt, user_message, require_json=require_json)
            self.last_source = "ollama"
            return result
        except Exception as e:
            logger.error(f"[ROUTER] Ollama also failed: {e}")
            raise RuntimeError(f"All AI backends failed. Last error: {e}")


# Global singleton — imported by incident_commander
router = AIRouter()
