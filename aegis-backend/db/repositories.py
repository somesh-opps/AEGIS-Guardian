"""
MongoDB CRUD repositories for all AEGIS collections.
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from db.models import (
    SensorReading, FusedReading, OccupancyReading,
    StoredIncident, BuildingStatus, ChatSession, ChatTurn
)
from config import CHAT_HISTORY_LIMIT


# ──────────────────────────────────────────────────────────────
# Sensor Readings
# ──────────────────────────────────────────────────────────────
async def save_sensor_reading(db: AsyncIOMotorDatabase, reading: SensorReading) -> None:
    await db.sensor_readings.insert_one(reading.model_dump())


async def save_fused_reading(db: AsyncIOMotorDatabase, reading: FusedReading) -> None:
    await db.fused_readings.insert_one(reading.model_dump())


# ──────────────────────────────────────────────────────────────
# Occupancy
# ──────────────────────────────────────────────────────────────
async def save_occupancy(db: AsyncIOMotorDatabase, occ: OccupancyReading) -> None:
    await db.occupancy_readings.insert_one(occ.model_dump())


async def get_latest_occupancy(db: AsyncIOMotorDatabase, building: str) -> int:
    """Return latest people_inside count for a building (0 if unknown)."""
    doc = await db.occupancy_readings.find_one(
        {"building": building},
        sort=[("timestamp", -1)]
    )
    return doc["people_inside"] if doc else 0


# ──────────────────────────────────────────────────────────────
# Incidents
# ──────────────────────────────────────────────────────────────
async def save_incident(db: AsyncIOMotorDatabase, incident: StoredIncident) -> str:
    await db.incidents.insert_one(incident.model_dump())
    return incident.incident_id


async def get_incident(db: AsyncIOMotorDatabase, incident_id: str) -> Optional[dict]:
    return await db.incidents.find_one({"incident_id": incident_id}, {"_id": 0})


async def list_recent_incidents(db: AsyncIOMotorDatabase, limit: int = 20) -> list[dict]:
    cursor = db.incidents.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit)
    return await cursor.to_list(length=limit)


async def resolve_incident(db: AsyncIOMotorDatabase, incident_id: str) -> None:
    await db.incidents.update_one(
        {"incident_id": incident_id},
        {"$set": {"status": "RESOLVED"}}
    )


async def get_active_incident(db: AsyncIOMotorDatabase, building: str) -> Optional[dict]:
    return await db.incidents.find_one(
        {"building": building, "status": "ACTIVE"},
        {"_id": 0},
        sort=[("timestamp", -1)]
    )


# ──────────────────────────────────────────────────────────────
# Campus Status (upserted per building)
# ──────────────────────────────────────────────────────────────
async def upsert_building_status(db: AsyncIOMotorDatabase, status: BuildingStatus) -> None:
    await db.campus_status.update_one(
        {"building": status.building},
        {"$set": status.model_dump()},
        upsert=True
    )


async def get_all_building_statuses(db: AsyncIOMotorDatabase) -> list[dict]:
    from config import NODE_BUILDING_MAP
    valid_buildings = list({
        v["building"] if isinstance(v, dict) else v
        for v in NODE_BUILDING_MAP.values()
    })
    cursor = db.campus_status.find({"building": {"$in": valid_buildings}}, {"_id": 0})
    return await cursor.to_list(length=100)



async def get_building_status(db: AsyncIOMotorDatabase, building: str) -> Optional[dict]:
    return await db.campus_status.find_one({"building": building}, {"_id": 0})


# ──────────────────────────────────────────────────────────────
# Chat Sessions
# ──────────────────────────────────────────────────────────────
async def get_or_create_session(db: AsyncIOMotorDatabase, session_id: Optional[str]) -> ChatSession:
    if session_id:
        doc = await db.chat_sessions.find_one({"session_id": session_id})
        if doc:
            doc.pop("_id", None)
            return ChatSession(**doc)
    # New session
    session = ChatSession()
    await db.chat_sessions.insert_one(session.model_dump())
    return session


async def append_chat_turn(db: AsyncIOMotorDatabase, session_id: str, turn: ChatTurn) -> None:
    await db.chat_sessions.update_one(
        {"session_id": session_id},
        {"$push": {"turns": turn.model_dump()}}
    )


async def get_recent_turns(db: AsyncIOMotorDatabase, session_id: str) -> list[dict]:
    doc = await db.chat_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not doc:
        return []
    turns = doc.get("turns", [])
    return turns[-CHAT_HISTORY_LIMIT * 2:]   # last N user+assistant pairs
