"""
Incident query endpoints — served to the app backend.
"""
from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
from db.mongo import get_db
from db import repositories as repo

router = APIRouter(prefix="/api/v1/incidents", tags=["Incidents"])


@router.get("", summary="List recent incidents")
async def list_incidents(limit: int = Query(default=20, ge=1, le=100)):
    db = get_db()
    incidents = await repo.list_recent_incidents(db, limit=limit)
    return {"total": len(incidents), "incidents": incidents}


@router.get("/{incident_id}", summary="Get single incident detail")
async def get_incident(incident_id: str):
    db = get_db()
    incident = await repo.get_incident(db, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
    return incident


@router.patch("/{incident_id}/resolve", summary="Mark incident as resolved")
async def resolve_incident(incident_id: str):
    db = get_db()
    incident = await repo.get_incident(db, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
    await repo.resolve_incident(db, incident_id)

    # Update building status back to SAFE
    from db.models import BuildingStatus
    await repo.upsert_building_status(db, BuildingStatus(
        building=incident["building"],
        status="SAFE",
        active_incident=None,
    ))

    return {"status": "resolved", "incident_id": incident_id}
