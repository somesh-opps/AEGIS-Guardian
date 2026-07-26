"""
AEGIS Sensor API — Firebase is now the sole sensor source.
The old ESP32 /ingest endpoint has been removed.
Only endpoints here: firebase-sync (manual trigger) and nodes-snapshot (dashboard).
"""
from __future__ import annotations
import logging
from fastapi import APIRouter
from services.firebase_service import fetch_and_process_firebase_sensors, get_last_nodes_snapshot

logger = logging.getLogger("aegis.sensor")
router = APIRouter(prefix="/api/v1/sensor", tags=["Sensor"])


@router.post("/firebase-sync", summary="Manually trigger Firebase RTDB sensor sync")
async def trigger_firebase_sync():
    """
    Manually triggers a one-shot fetch from the Firebase Realtime Database and
    runs the full AEGIS pipeline (fusion → detection → AI → broadcast).
    """
    result = await fetch_and_process_firebase_sensors()
    return result


@router.get("/nodes", summary="Get latest Firebase sensor node snapshot")
async def get_nodes_snapshot():
    """
    Returns the most recently cached Firebase RTDB node data, including
    all fields: temperature, gas, flame, humidity, distance, room, status.
    """
    snapshot = get_last_nodes_snapshot()
    return {
        "status": "ok",
        "nodes": snapshot,
        "count": len(snapshot),
    }
