"""
Pydantic v2 data models for all AEGIS collections.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Optional
from pydantic import BaseModel, Field
import uuid


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


# ──────────────────────────────────────────────────────────────
# Inbound — Firebase Node / Sensor Reading
# ──────────────────────────────────────────────────────────────
class SensorReading(BaseModel):
    node_id:       str
    building:      Optional[str] = None        # from Firebase payload
    room:          Optional[str] = None        # e.g. "Electrical Lab"
    temperature:   float = 25.0
    smoke:         int = 0                     # derived from flame if absent
    gas:           int = 0
    current:       float = 0.0
    motion:        bool = False
    panic_button:  bool = False
    flame:         bool = False                # direct flame sensor
    humidity:      float = 0.0                 # relative humidity %
    distance:      Optional[float] = None      # ultrasonic distance cm
    firebase_status: Optional[str] = None      # NORMAL / ALERT from Firebase
    timestamp:     datetime = Field(default_factory=_now)


# ──────────────────────────────────────────────────────────────
# Internal — Post-Fusion Labeled Reading
# ──────────────────────────────────────────────────────────────
class FusedReading(BaseModel):
    node_id:    str
    building:   str
    floor:      int
    room:       Optional[str] = None
    timestamp:  datetime = Field(default_factory=_now)
    environment: dict[str, Any]   # temperature, smoke, gas, humidity, flame labels
    electrical:  dict[str, Any]   # current (label)
    occupancy:   dict[str, Any]   # motion bool
    panic_button: bool
    firebase_status: Optional[str] = None      # passthrough from Firebase


# ──────────────────────────────────────────────────────────────
# Inbound — YOLO Occupancy Push
# ──────────────────────────────────────────────────────────────
class OccupancyReading(BaseModel):
    building:      str
    cam_id:        str
    people_inside: int
    timestamp:     datetime = Field(default_factory=_now)


# ──────────────────────────────────────────────────────────────
# Incident Package (sent to AI)
# ──────────────────────────────────────────────────────────────
class IncidentPackage(BaseModel):
    incident_id:   str = Field(default_factory=lambda: f"INC_{_uuid()[:8].upper()}")
    timestamp:     datetime = Field(default_factory=_now)
    building:      str
    floor:         int
    room:          Optional[str] = None
    incident_type: str
    sensor_summary: dict[str, Any]
    occupancy:     dict[str, Any]


# ──────────────────────────────────────────────────────────────
# AI Analysis Response
# ──────────────────────────────────────────────────────────────
class IncidentAnalysis(BaseModel):
    incident:       dict[str, Any]       # type, severity, confidence
    analysis:       dict[str, Any]       # cause, spread_risk
    public_advisory: dict[str, Any]      # title, message, priority
    responders:     list[str]


# ──────────────────────────────────────────────────────────────
# Full Stored Incident (Package + AI Decision)
# ──────────────────────────────────────────────────────────────
class StoredIncident(BaseModel):
    incident_id:   str
    timestamp:     datetime
    building:      str
    floor:         int
    room:          Optional[str] = None
    incident_type: str
    sensor_summary: dict[str, Any]
    occupancy:     dict[str, Any]
    ai_analysis:   Optional[dict[str, Any]] = None
    status:        str = "ACTIVE"        # ACTIVE | RESOLVED
    created_at:    datetime = Field(default_factory=_now)


# ──────────────────────────────────────────────────────────────
# Campus Status (per-building, upserted)
# ──────────────────────────────────────────────────────────────
class BuildingStatus(BaseModel):
    building:         str
    status:           str = "SAFE"       # SAFE | WARNING | CRITICAL
    active_incident:  Optional[str] = None   # incident_id or None
    people_inside:    int = 0
    last_updated:     datetime = Field(default_factory=_now)


# ──────────────────────────────────────────────────────────────
# Chat
# ──────────────────────────────────────────────────────────────
class ChatTurn(BaseModel):
    role:      str    # "user" | "assistant"
    content:   str
    timestamp: datetime = Field(default_factory=_now)


class ChatSession(BaseModel):
    session_id: str = Field(default_factory=_uuid)
    building:   Optional[str] = None
    turns:      list[ChatTurn] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=_now)


# ──────────────────────────────────────────────────────────────
# API Request/Response schemas
# ──────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    question:   str
    building:   Optional[str] = None   # optional context hint


class ChatResponse(BaseModel):
    session_id: str
    answer:     str
    source:     str    # "gemini" | "ollama"
