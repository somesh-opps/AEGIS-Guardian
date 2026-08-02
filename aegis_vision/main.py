"""
AEGIS Vision — Entry Point

Starts one thread per camera config:
 - Real cameras → Face Counter (Haar Cascade + CentroidTracker + line crossing)
 - Simulated cameras → Fake occupancy generator (sine wave)

On shutdown (CTRL+C), headcount is reset to 0 in MongoDB via the backend API.
"""
from __future__ import annotations
import logging
import threading
from config import CAMERAS
from tracker.opencv_worker import run_camera_worker, _push_count
from simulator.fake_occupancy import run_simulated_worker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger("aegis.vision")


def _reset_all_counts() -> None:
    """Push 0 headcount for every camera on shutdown to clear MongoDB occupancy."""
    logger.info("[VISION] Resetting all headcounts to 0 in MongoDB…")
    for cam_cfg in CAMERAS:
        cam_id   = cam_cfg["cam_id"]
        building = cam_cfg["building"]
        try:
            _push_count(cam_id, building, 0)
            logger.info(f"[VISION] Reset {building} ({cam_id}) → 0")
        except Exception as e:
            logger.warning(f"[VISION] Failed to reset {cam_id}: {e}")


def main() -> None:
    logger.info(f"[VISION] Starting AEGIS Vision — {len(CAMERAS)} camera(s)")

    threads: list[threading.Thread] = []

    for cam_cfg in CAMERAS:
        if cam_cfg.get("simulated"):
            target = run_simulated_worker
            name   = f"sim-{cam_cfg['cam_id']}"
        else:
            target = run_camera_worker
            name   = f"cam-{cam_cfg['cam_id']}"

        t = threading.Thread(target=target, args=(cam_cfg,), name=name, daemon=True)
        t.start()
        threads.append(t)
        logger.info(f"[VISION] Started thread: {name}")

    # Keep main thread alive until CTRL+C
    try:
        for t in threads:
            t.join()
    except KeyboardInterrupt:
        logger.info("[VISION] Shutdown requested — clearing occupancy counts…")
        _reset_all_counts()
        logger.info("[VISION] All headcounts reset to 0. Goodbye.")


if __name__ == "__main__":
    main()

