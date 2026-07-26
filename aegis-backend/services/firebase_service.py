"""
AEGIS Firebase Realtime Database Integration Service
Polls the live Firebase RTDB sensor feed, parses ALL fields (humidity, flame,
distance, room, firebase_status), and runs the full AEGIS pipeline.

DEDUPLICATION & AUTO-RESOLUTION:
- Deduplication: If an ACTIVE incident of the same type already exists, we skip creating a new one.
- Auto-Resolution: When sensors return to normal, any active incident for the building is resolved.
"""
from __future__ import annotations
import asyncio
import logging
from typing import Any
import httpx

from config import FIREBASE_RTDB_URL, FIREBASE_POLL_INTERVAL_SECONDS, NODE_BUILDING_MAP
from db.mongo import get_db
from db.models import SensorReading, StoredIncident, BuildingStatus
from db import repositories as repo
from core import fusion, detection, incident_builder
from ai import incident_commander
from websocket.broadcaster import manager

logger = logging.getLogger("aegis.services.firebase")

_is_polling = False

# Cache last fetched snapshot for dashboard /nodes endpoint
_last_nodes_snapshot: dict[str, Any] = {}


async def fetch_and_process_firebase_sensors() -> dict[str, Any]:
    """
    Fetch all nodes from Firebase RTDB and run the AEGIS pipeline.
    Auto-resolves active incidents when sensor readings return to safe levels.
    """
    global _last_nodes_snapshot
    db = get_db()
    results = []

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(FIREBASE_RTDB_URL)
            resp.raise_for_status()
            raw_data = resp.json()
    except Exception as e:
        logger.error(f"[FIREBASE] Fetch error from {FIREBASE_RTDB_URL}: {e}")
        return {"status": "error", "message": str(e)}

    nodes_data = raw_data.get("nodes", {}) if isinstance(raw_data, dict) else {}
    if not nodes_data:
        logger.warning("[FIREBASE] No 'nodes' object found in Firebase response")
        return {"status": "ok", "nodes_processed": 0}

    # Cache raw snapshot for dashboard
    _last_nodes_snapshot = nodes_data

    for key, item in nodes_data.items():
        if not isinstance(item, dict):
            continue

        node_id  = str(item.get("node_id", key))
        building = item.get("building")
        room     = item.get("room")

        # Dynamically register building mapping from Firebase payload
        if building:
            NODE_BUILDING_MAP[node_id] = {
                "building": building,
                "floor":    item.get("floor", 1),
                "room":     room,
            }

        # ── Parse all Firebase sensor fields ─────────────────────
        temp         = float(item.get("temperature", 25.0))
        gas_val      = int(item.get("gas", 0))
        current_val  = float(item.get("current", 0.0))
        motion_val   = bool(item.get("motion", False))
        panic_val    = bool(item.get("panic_button", False))
        flame_val    = bool(item.get("flame", False))
        humidity_val = float(item.get("humidity", 0.0))
        distance_val = float(item.get("distance")) if item.get("distance") is not None else None
        fb_status    = item.get("status", "NORMAL")

        # Smoke: derive from flame sensor if smoke field absent
        if "smoke" in item:
            smoke_val = int(item["smoke"])
        else:
            smoke_val = 400 if flame_val else 0

        reading = SensorReading(
            node_id         = node_id,
            building        = building,
            room            = room,
            temperature     = temp,
            smoke           = smoke_val,
            gas             = gas_val,
            current         = current_val,
            motion          = motion_val,
            panic_button    = panic_val,
            flame           = flame_val,
            humidity        = humidity_val,
            distance        = distance_val,
            firebase_status = fb_status,
        )

        # Pipeline Step 1: Save raw reading to Mongo
        await repo.save_sensor_reading(db, reading)

        # Pipeline Step 2: Sensor Fusion
        fused = fusion.fuse(reading)
        if not fused:
            continue
        await repo.save_fused_reading(db, fused)

        # Pipeline Step 3: Event Detection
        det_result = detection.detect(fused)

        if not det_result.is_incident:
            # Auto-resolve any existing active incident when sensors return to normal
            active = await repo.get_active_incident(db, fused.building)
            if active:
                logger.info(f"[FIREBASE] Sensors back to normal. Resolving incident {active['incident_id']} in {fused.building}")
                await repo.resolve_incident(db, active["incident_id"])
                # Broadcast resolve event over WebSocket to update UI
                await manager.broadcast({
                    "event": "INCIDENT_RESOLVED",
                    "incident_id": active["incident_id"],
                    "building": fused.building,
                })
            
            # Preserve current occupancy count from vision — don't overwrite with 0
            existing_status = await repo.get_building_status(db, fused.building)
            current_people = existing_status.get("people_inside", 0) if existing_status else 0

            await repo.upsert_building_status(
                db,
                BuildingStatus(
                    building      = fused.building,
                    status        = "SAFE",
                    people_inside = current_people,
                ),
            )
            results.append({"node_id": node_id, "building": fused.building, "incident": False})
            continue

        # ── DEDUPLICATION: update existing incident in DB instead of invoking AI again ───
        existing = await repo.get_active_incident(db, fused.building)
        if existing and existing.get("incident_type") == det_result.incident_type:
            package = await incident_builder.build(db, fused, det_result)
            await db.incidents.update_one(
                {"incident_id": existing["incident_id"]},
                {
                    "$set": {
                        "sensor_summary": package.sensor_summary,
                        "occupancy": package.occupancy,
                        "timestamp": package.timestamp,
                    }
                }
            )
            # Also update building status with latest estimated occupancy
            severity = (existing.get("ai_analysis") or {}).get("incident", {}).get("severity", "High")
            status_label = "CRITICAL" if severity in ("Critical", "High") else "WARNING"
            await repo.upsert_building_status(
                db,
                BuildingStatus(
                    building        = fused.building,
                    status          = status_label,
                    active_incident = existing["incident_id"],
                    people_inside   = package.occupancy.get("estimated_people", 0),
                ),
            )
            results.append({
                "node_id":     node_id,
                "building":    fused.building,
                "incident":    True,
                "updated_db":  True,
                "incident_id": existing["incident_id"],
                "type":        det_result.incident_type,
            })
            continue

        # ── New or escalated incident — run full pipeline ──────────────────

        # Pipeline Step 4: Build Incident Package
        package = await incident_builder.build(db, fused, det_result)

        # Pipeline Step 5: AI Incident Commander Analysis
        try:
            analysis, source = await incident_commander.analyze_incident(package)
        except Exception as ex:
            logger.error(f"[FIREBASE] AI analysis failed for {node_id}: {ex}")
            analysis, source = None, "none"

        severity     = (analysis or {}).get("incident", {}).get("severity", "High")
        status_label = "CRITICAL" if severity in ("Critical", "High") else "WARNING"

        # Pipeline Step 6: Store Incident
        stored = StoredIncident(
            incident_id    = package.incident_id,
            timestamp      = package.timestamp,
            building       = package.building,
            floor          = package.floor,
            room           = package.room,
            incident_type  = package.incident_type,
            sensor_summary = package.sensor_summary,
            occupancy      = package.occupancy,
            ai_analysis    = analysis,
            status         = "ACTIVE",
        )
        await repo.save_incident(db, stored)

        # Pipeline Step 7: Update Building Status
        advisory = (analysis or {}).get("public_advisory", {})
        await repo.upsert_building_status(
            db,
            BuildingStatus(
                building        = fused.building,
                status          = status_label,
                active_incident = package.incident_id,
                people_inside   = package.occupancy.get("estimated_people", 0),
            ),
        )

        # Pipeline Step 8: WebSocket Broadcast
        broadcast_payload = {
            "event":       "NEW_INCIDENT",
            "incident_id": package.incident_id,
            "status":      status_label,
            "building":    package.building,
            "floor":       package.floor,
            "room":        fused.room,
            "title":       advisory.get("title", package.incident_type),
            "message":     advisory.get("message", "Emergency detected. Follow safety procedures."),
            "priority":    advisory.get("priority", "Urgent"),
            "responders":  (analysis or {}).get("responders", []),
            "ai_source":   source,
        }
        await manager.broadcast(broadcast_payload)
        logger.info(
            f"[FIREBASE] NEW incident for {node_id} "
            f"({fused.building}/{fused.room}): {det_result.incident_type} → {status_label}"
        )

        results.append({
            "node_id":     node_id,
            "building":    fused.building,
            "room":        fused.room,
            "incident":    True,
            "incident_id": package.incident_id,
            "type":        package.incident_type,
            "status":      status_label,
            "ai_source":   source,
        })

    return {"status": "ok", "nodes_processed": len(results), "details": results}


def get_last_nodes_snapshot() -> dict[str, Any]:
    """Return the last fetched Firebase nodes snapshot (for dashboard /nodes API)."""
    return _last_nodes_snapshot


async def start_firebase_loop():
    """Background polling task — runs continuously every FIREBASE_POLL_INTERVAL_SECONDS."""
    global _is_polling
    _is_polling = True
    logger.info(f"[FIREBASE] Starting background poll loop every {FIREBASE_POLL_INTERVAL_SECONDS}s")

    while _is_polling:
        try:
            await fetch_and_process_firebase_sensors()
        except Exception as e:
            logger.error(f"[FIREBASE] Loop execution error: {e}")
        await asyncio.sleep(FIREBASE_POLL_INTERVAL_SECONDS)


def stop_firebase_loop():
    global _is_polling
    _is_polling = False
