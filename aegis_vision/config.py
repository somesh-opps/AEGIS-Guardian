"""
aegis-vision Configuration
"""

# ── FastAPI Brain endpoint ────────────────────────────────────
BACKEND_URL    = "http://localhost:8000/api/v1/occupancy"
VISION_SECRET  = "aegis-vision-secret"   # must match backend config.py

# ── Camera Configuration ──────────────────────────────────────
# Each entry: camera source → building mapping
# cam_source: 0 = default webcam, 1 = second camera, or an RTSP URL
CAMERAS = [
    {
        "cam_id":    "CAM_ACAD_ENTRANCE",
        "cam_source": 0,                       # USB webcam index
        "building":  "Academic Block",
        "simulated": False,
        # Virtual line: two (x, y) points drawn across the doorway
        # Adjust these to match your camera's door position
        "line_start": (320, 200),
        "line_end":   (320, 400),
    },
    {
        "cam_id":    "CAM_RES_ENTRANCE",
        "cam_source": None,                    # No camera — simulated
        "building":  "Research Block",
        "simulated": True,
        "line_start": (320, 200),
        "line_end":   (320, 400),
    },
]

# ── YOLO Model ────────────────────────────────────────────────
YOLO_MODEL      = "yolov8n.pt"   # downloaded automatically on first run
YOLO_CONFIDENCE = 0.4            # minimum detection confidence
YOLO_CLASSES    = [0]            # class 0 = person (COCO)

# ── Push Rate ─────────────────────────────────────────────────
PUSH_INTERVAL_SECONDS = 1.0      # push to backend every N seconds
