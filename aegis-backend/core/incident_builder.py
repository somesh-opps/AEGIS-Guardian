"""
Incident Package Builder — assembles the structured JSON object sent to AI.
Pulls live occupancy from DB and merges with fused sensor data.
Includes all Firebase fields: flame, humidity, distance, room.
"""
from __future__ import annotations
from motor.motor_asyncio import AsyncIOMotorDatabase
from db.models import FusedReading, IncidentPackage
from core.detection import DetectionResult
from db.repositories import get_latest_occupancy


async def build(
    db: AsyncIOMotorDatabase,
    fused: FusedReading,
    detection: DetectionResult,
) -> IncidentPackage:
    """
    Build a complete incident package for the AI Incident Commander.
    Includes all Firebase sensor fields so the AI has full context.
    """
    people_inside = await get_latest_occupancy(db, fused.building)
    env  = fused.environment
    elec = fused.electrical

    sensor_summary = {
        "temperature":       env["temperature"],
        "temperature_label": env["temperature_label"],
        "smoke":             env["smoke_label"],
        "gas":               env["gas_label"],
        "gas_ppm":           env["gas"],
        "flame":             env.get("flame", False),
        "humidity":          env.get("humidity", 0.0),
        "humidity_label":    env.get("humidity_label", "NORMAL"),
        "distance_cm":       env.get("distance"),
        "current":           elec["current_label"],
        "current_amps":      elec["current"],
        "motion":            fused.occupancy["motion"],
        "panic_button":      fused.panic_button,
    }

    occupancy = {
        "estimated_people": people_inside,
        "motion_detected":  fused.occupancy["motion"],
    }

    return IncidentPackage(
        building       = fused.building,
        floor          = fused.floor,
        room           = fused.room,
        incident_type  = detection.incident_type,
        sensor_summary = sensor_summary,
        occupancy      = occupancy,
    )
