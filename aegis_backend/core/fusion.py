"""
Sensor Fusion Engine — converts raw Firebase/sensor readings into semantic labels.
Handles: temperature, gas, smoke (or flame), current, humidity, distance, motion.
"""
from __future__ import annotations
from db.models import SensorReading, FusedReading
from config import THRESHOLDS, NODE_BUILDING_MAP


def _label_range(value: float | int, ranges: dict[str, tuple[int, int]]) -> str:
    for label, (lo, hi) in ranges.items():
        if lo <= value <= hi:
            return label
    return "UNKNOWN"


def fuse(reading: SensorReading) -> FusedReading | None:
    """
    Convert raw SensorReading into a FusedReading with semantic labels.
    Supports all Firebase fields: flame, humidity, distance, room.
    Falls back to NODE_BUILDING_MAP if building not in reading.
    """
    # Prefer building embedded in the reading (from Firebase), else look up config
    if reading.building:
        building = reading.building
        floor = NODE_BUILDING_MAP.get(reading.node_id, {}).get("floor", 1)
    else:
        mapping = NODE_BUILDING_MAP.get(reading.node_id)
        if not mapping:
            mapping = {"building": f"Building {reading.node_id}", "floor": 1}
        building = mapping["building"]
        floor = mapping["floor"]

    # If flame sensor is triggered, treat it as HIGH smoke (400 ppm equivalent)
    effective_smoke = reading.smoke if reading.smoke > 0 else (400 if reading.flame else 0)

    smoke_label   = _label_range(effective_smoke,   THRESHOLDS["smoke"])
    gas_label     = _label_range(reading.gas,        THRESHOLDS["gas"])
    temp_label    = _label_range(reading.temperature, THRESHOLDS["temperature"])
    current_label = (
        "ABNORMAL" if reading.current > THRESHOLDS["current_abnormal_threshold"]
        else "NORMAL"
    )
    humidity_label = _label_range(reading.humidity, THRESHOLDS["humidity"])

    return FusedReading(
        node_id  = reading.node_id,
        building = building,
        floor    = floor,
        room     = reading.room,
        timestamp = reading.timestamp,
        firebase_status = reading.firebase_status,
        environment = {
            "temperature":       reading.temperature,
            "temperature_label": temp_label,
            "smoke":             effective_smoke,
            "smoke_label":       smoke_label,
            "gas":               reading.gas,
            "gas_label":         gas_label,
            "flame":             reading.flame,
            "humidity":          reading.humidity,
            "humidity_label":    humidity_label,
            "distance":          reading.distance,
        },
        electrical = {
            "current":       reading.current,
            "current_label": current_label,
        },
        occupancy = {
            "motion": reading.motion,
        },
        panic_button = reading.panic_button,
    )
