"""
GET /api/v1/campus/status — serves current campus-wide status to app backend.
"""
from __future__ import annotations
from fastapi import APIRouter
from db.mongo import get_db
from db import repositories as repo

router = APIRouter(prefix="/api/v1/campus", tags=["Campus Status"])


@router.get("/status", summary="Get live campus-wide building status")
async def campus_status():
    db = get_db()
    statuses = await repo.get_all_building_statuses(db)
    return {
        "total_buildings": len(statuses),
        "buildings": statuses,
    }


@router.get("/status/{building}", summary="Get status for a specific building")
async def building_status(building: str):
    db = get_db()
    status = await repo.get_building_status(db, building)
    if not status:
        return {
            "building": building,
            "status": "SAFE",
            "people_inside": 0,
            "active_incident": None,
        }
    return status
