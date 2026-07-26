"""
YOLO Worker — runs YOLOv8n + ByteTrack on a camera feed,
counts people crossing the virtual line, and pushes to FastAPI every N seconds.
"""
from __future__ import annotations
import time
import asyncio
import logging
import threading
from datetime import datetime, timezone
import cv2
import httpx
from ultralytics import YOLO

# Fix for PyTorch 2.6+ unpickling error with older ultralytics
import torch
_old_load = torch.load
def _new_load(*args, **kwargs):
    kwargs["weights_only"] = False
    return _old_load(*args, **kwargs)
torch.load = _new_load

from tracker.line_crossing import LineCrossingCounter
from config import (
    YOLO_MODEL, YOLO_CONFIDENCE, YOLO_CLASSES,
    BACKEND_URL, VISION_SECRET, PUSH_INTERVAL_SECONDS,
)

logger = logging.getLogger("aegis.vision.worker")


def _push_count(cam_id: str, building: str, count: int) -> None:
    """Synchronous HTTP POST to FastAPI backend (called from a thread)."""
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
        logger.warning(f"[WORKER {cam_id}] Push failed: {e}")


def run_camera_worker(cam_cfg: dict) -> None:
    """
    Blocking worker loop for one camera.
    Call this in a separate thread per camera.
    """
    cam_id     = cam_cfg["cam_id"]
    cam_source = cam_cfg["cam_source"]
    building   = cam_cfg["building"]
    line_start = cam_cfg["line_start"]
    line_end   = cam_cfg["line_end"]

    logger.info(f"[WORKER {cam_id}] Starting — building: {building}")

    model   = YOLO(YOLO_MODEL)
    counter = LineCrossingCounter(line_start, line_end)
    cap     = cv2.VideoCapture(cam_source)

    if not cap.isOpened():
        logger.error(f"[WORKER {cam_id}] Cannot open camera source: {cam_source}")
        return

    last_push = time.monotonic()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                logger.warning(f"[WORKER {cam_id}] Frame read failed — retrying…")
                time.sleep(0.5)
                continue

            # Run YOLOv8n with ByteTrack
            results = model.track(
                frame,
                persist=True,
                classes=YOLO_CLASSES,
                conf=YOLO_CONFIDENCE,
                tracker="bytetrack.yaml",
                verbose=False,
                device="0" if torch.cuda.is_available() else "cpu",
            )

            # Process detections
            active_ids: set[int] = set()
            if results and results[0].boxes is not None:
                boxes  = results[0].boxes
                xyxy   = boxes.xyxy.cpu().numpy()
                ids    = boxes.id

                if ids is not None:
                    for bbox, tid in zip(xyxy, ids.int().cpu().numpy()):
                        counter.update(int(tid), tuple(bbox))
                        active_ids.add(int(tid))

            # Release disappeared tracks
            disappeared = set(counter._prev_centroids.keys()) - active_ids
            for tid in disappeared:
                counter.release_track(tid)

            # Draw overlay (optional — comment out if running headless)
            _draw_overlay(frame, counter, line_start, line_end)
            cv2.imshow(f"AEGIS Vision — {cam_id}", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

            # Push at interval
            now = time.monotonic()
            if now - last_push >= PUSH_INTERVAL_SECONDS:
                logger.info(f"YOLO WORKER PUSHING: {counter.people_inside} for {building}")
                _push_count(cam_id, building, counter.people_inside)
                last_push = now

    finally:
        cap.release()
        cv2.destroyAllWindows()
        logger.info(f"[WORKER {cam_id}] Stopped.")


def _draw_overlay(
    frame,
    counter: LineCrossingCounter,
    line_start: tuple,
    line_end:   tuple,
) -> None:
    """Draw the virtual line and counters on the frame."""
    cv2.line(frame, line_start, line_end, (0, 255, 255), 2)
    cv2.putText(frame, f"IN:  {counter.in_count}",      (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0),  2)
    cv2.putText(frame, f"OUT: {counter.out_count}",     (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255),  2)
    cv2.putText(frame, f"INSIDE: {counter.people_inside}", (10, 95),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 0), 2)
