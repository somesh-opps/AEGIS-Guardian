"""
POST /api/v1/occupancy — receives per-building occupancy count from aegis-vision.
Updates MongoDB campus_status with latest people_inside count.
"""
from __future__ import annotations
import logging
from fastapi import APIRouter, Header, HTTPException
from db.mongo import get_db
from db.models import OccupancyReading
from db import repositories as repo
from config import VISION_PUSH_SECRET

logger = logging.getLogger("aegis.occupancy")
router = APIRouter(prefix="/api/v1/occupancy", tags=["Occupancy"])


@router.post("", summary="Receive YOLO occupancy count from vision service")
async def receive_occupancy(
    reading: OccupancyReading,
    x_vision_secret: str = Header(default=""),
):
    # Simple shared-secret auth so only aegis-vision can push
    if x_vision_secret != VISION_PUSH_SECRET:
        raise HTTPException(status_code=403, detail="Invalid vision service secret")

    db = get_db()

    # Store occupancy reading
    await repo.save_occupancy(db, reading)

    # Update campus_status people_inside counter (upsert — only update occupancy field)
    await db.campus_status.update_one(
        {"building": reading.building},
        {
            "$set": {
                "people_inside": reading.people_inside,
                "last_updated":  reading.timestamp,
            }
        },
        upsert=True,
    )

    logger.info(
        f"[OCCUPANCY] {reading.building} — {reading.people_inside} people inside "
        f"(cam: {reading.cam_id})"
    )
    return {"status": "ok", "building": reading.building, "people_inside": reading.people_inside}
