"""
OpenCV Worker — uses Haar Cascade Face Detection to count people.
Detects faces in each frame (no recognition) and counts the number of faces
currently visible as the live headcount. Runs blazing fast on CPU.
"""
from __future__ import annotations
import time
import logging
import cv2
import httpx
from datetime import datetime, timezone

from config import (
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
    Blocking worker loop for one camera using Haar Cascade face detection.
    Counts people (faces) crossing the virtual line without any recognition.
    """
    cam_id     = cam_cfg["cam_id"]
    cam_source = cam_cfg["cam_source"]
    building   = cam_cfg["building"]
    line_start = cam_cfg["line_start"]
    line_end   = cam_cfg["line_end"]

    logger.info(f"[WORKER {cam_id}] Starting Face Counter — building: {building}")

    # Load the bundled Haar Cascade for frontal faces (no download needed)
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    if face_cascade.empty():
        logger.error(f"[WORKER {cam_id}] Haar Cascade model failed to load!")
        return

    cap = cv2.VideoCapture(cam_source)
    if not cap.isOpened():
        logger.error(f"[WORKER {cam_id}] Cannot open camera source: {cam_source}")
        return

    last_push = time.monotonic()
    current_count = 0
    last_face_seen = None          # timestamp of last frame that had a face
    RESET_AFTER_SECONDS = 30.0    # reset count to 0 if no face for this long

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                logger.warning(f"[WORKER {cam_id}] Frame read failed — retrying…")
                time.sleep(0.5)
                continue

            # Convert to grayscale for face detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # Detect faces — counts every visible face in the current frame
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=4,
                minSize=(30, 30),
                flags=cv2.CASCADE_SCALE_IMAGE,
            )

            # Number of faces in frame = live headcount
            raw_count = len(faces) if len(faces) > 0 else 0

            now = time.monotonic()

            if raw_count > 0:
                # Faces detected — update count and refresh the inactivity timer
                current_count = raw_count
                last_face_seen = now
            else:
                # No faces in this frame — check inactivity timer
                if last_face_seen is not None:
                    idle_secs = now - last_face_seen
                    if idle_secs >= RESET_AFTER_SECONDS:
                        if current_count != 0:
                            logger.info(f"[WORKER {cam_id}] No face for {RESET_AFTER_SECONDS:.0f}s — resetting count to 0")
                            current_count = 0
                            _push_count(cam_id, building, 0)  # immediate reset push
                else:
                    current_count = 0

            # Draw orange boxes on each detected face
            for (x, y, w, h) in (faces if raw_count > 0 else []):
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 165, 255), 2)
                cv2.putText(frame, "Face", (x, y - 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)

            # Compute idle time for overlay
            idle_time = (now - last_face_seen) if last_face_seen else None

            # Draw headcount overlay
            _draw_overlay(frame, current_count, idle_time, RESET_AFTER_SECONDS)

            cv2.imshow(f"AEGIS Vision \u2014 {cam_id}", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

            # Push live headcount to backend at configured interval
            if now - last_push >= PUSH_INTERVAL_SECONDS:
                logger.info(f"FACE COUNTER PUSHING: {current_count} for {building}")
                _push_count(cam_id, building, current_count)
                last_push = now

    finally:
        cap.release()
        cv2.destroyAllWindows()
        logger.info(f"[WORKER {cam_id}] Stopped.")


def _draw_overlay(frame, count: int, idle_time, reset_after: float) -> None:
    """Draw live headcount and inactivity countdown on the frame."""
    cv2.putText(frame, f"FACES DETECTED: {count}", (10, 35),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 0), 2)
    if count == 0 and idle_time is not None:
        remaining = max(0.0, reset_after - idle_time)
        label = f"Reset in {remaining:.0f}s" if remaining > 0 else "Count reset!"
        cv2.putText(frame, label, (10, 70),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 80, 255), 2)
