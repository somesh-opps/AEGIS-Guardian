"""
Fake Occupancy Simulator — for buildings without a real camera.
Generates a realistic occupancy pattern (sine wave + noise) and
pushes to FastAPI every second, just like a real camera worker would.
"""
from __future__ import annotations
import time
import math
import random
import logging
from datetime import datetime, timezone
import httpx
from config import BACKEND_URL, VISION_SECRET, PUSH_INTERVAL_SECONDS

logger = logging.getLogger("aegis.vision.simulator")


def _push_count(cam_id: str, building: str, count: int) -> None:
    payload = {
        "building":      building,
        "cam_id":        cam_id,
        "people_inside": count,
        "timestamp":     datetime.now(timezone.utc).isoformat(),
    }
    headers = {"x-vision-secret": VISION_SECRET}
    try:
        with httpx.Client(timeout=5.0) as client:
            r = client.post(BACKEND_URL, json=payload, headers=headers)
            r.raise_for_status()
    except Exception as e:
        logger.warning(f"[SIM {cam_id}] Push failed: {e}")


def run_simulated_worker(cam_cfg: dict) -> None:
    """
    Simulates a realistic occupancy pattern.
    Peaks at mid-day (~60 people), low at night (~5 people).
    Adds small random noise to simulate movement in/out.
    """
    cam_id   = cam_cfg["cam_id"]
    building = cam_cfg["building"]

    logger.info(f"[SIM {cam_id}] Starting simulated occupancy — building: {building}")

    base_count = 0
    start_time = time.monotonic()

    while True:
        elapsed = time.monotonic() - start_time

        # Sine wave: period ≈ 8 hours (28800 seconds), peak = 60 people
        wave   = 30 + 30 * math.sin(2 * math.pi * elapsed / 28800 - math.pi / 2)
        noise  = random.randint(-3, 3)
        count  = max(0, int(wave + noise))

        _push_count(cam_id, building, count)
        logger.debug(f"[SIM {cam_id}] {building} — simulated: {count} people")

        time.sleep(PUSH_INTERVAL_SECONDS)
