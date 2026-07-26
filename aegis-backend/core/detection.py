"""
Event Detection Engine — rule-based trigger that decides if a fused reading
constitutes an incident worthy of AI analysis.
Updated to handle Firebase fields: flame, humidity, firebase_status.
"""
from __future__ import annotations
from db.models import FusedReading
from dataclasses import dataclass


@dataclass
class DetectionResult:
    is_incident:   bool
    incident_type: str = "NONE"
    confidence:    str = "LOW"   # LOW | MEDIUM | HIGH


def detect(fused: FusedReading) -> DetectionResult:
    """
    Apply rule-based thresholds to determine incident type.
    Returns DetectionResult with is_incident=False if nothing is triggered.

    Priority order (highest to lowest):
      1. Panic Button                               → Manual Emergency
      2. Flame + Temp HIGH + Current ABNORMAL       → Electrical Fire
      3. Flame + Temp HIGH/ELEVATED                 → Fire Detected
      4. Smoke HIGH + Temp HIGH + Current ABNORMAL  → Electrical Fire
      5. Smoke HIGH + Temp HIGH/ELEVATED            → Possible Fire
      6. Gas HIGH + Humidity HIGH                   → Chemical Hazard
      7. Gas HIGH                                   → Gas Leak
      8. Smoke MEDIUM + Current ABNORMAL            → Electrical Hazard
      9. Current ABNORMAL                           → Overcurrent Warning
      10. Firebase status = ALERT (passthrough)     → Firebase Alert
    """
    env  = fused.environment
    elec = fused.electrical

    smoke    = env.get("smoke_label",       "LOW")
    temp     = env.get("temperature_label", "NORMAL")
    gas      = env.get("gas_label",         "LOW")
    humidity = env.get("humidity_label",    "NORMAL")
    flame    = env.get("flame",             False)
    current  = elec.get("current_label",   "NORMAL")
    panic    = fused.panic_button
    fb_status = fused.firebase_status or "NORMAL"

    # Rule 1 — Manual Emergency (highest priority)
    if panic:
        return DetectionResult(is_incident=True, incident_type="Manual Emergency", confidence="HIGH")

    # Rule 2 — Electrical Fire (flame sensor + abnormal current)
    if flame and temp in ("HIGH", "ELEVATED") and current == "ABNORMAL":
        return DetectionResult(is_incident=True, incident_type="Electrical Fire", confidence="HIGH")

    # Rule 3 — Fire Detected (direct flame sensor)
    if flame and temp in ("HIGH", "ELEVATED"):
        return DetectionResult(is_incident=True, incident_type="Fire Detected", confidence="HIGH")

    # Rule 4 — Flame only (may not yet have high temp)
    if flame:
        return DetectionResult(is_incident=True, incident_type="Flame Detected", confidence="MEDIUM")

    # Rule 5 — Electrical Fire (smoke-based)
    if smoke == "HIGH" and temp == "HIGH" and current == "ABNORMAL":
        return DetectionResult(is_incident=True, incident_type="Electrical Fire", confidence="HIGH")

    # Rule 6 — Possible Fire (smoke-based)
    if smoke == "HIGH" and temp in ("HIGH", "ELEVATED"):
        return DetectionResult(is_incident=True, incident_type="Possible Fire", confidence="MEDIUM")

    # Rule 7 — Chemical Hazard (gas + high humidity = dangerous gas accumulation)
    if gas == "HIGH" and humidity == "HIGH":
        return DetectionResult(is_incident=True, incident_type="Chemical Hazard", confidence="HIGH")

    # Rule 8 — Gas Leak
    if gas == "HIGH":
        return DetectionResult(is_incident=True, incident_type="Gas Leak", confidence="MEDIUM")

    # Rule 9 — Electrical Hazard
    if smoke == "MEDIUM" and current == "ABNORMAL":
        return DetectionResult(is_incident=True, incident_type="Electrical Hazard", confidence="MEDIUM")

    # Rule 10 — Overcurrent Warning
    if current == "ABNORMAL":
        return DetectionResult(is_incident=True, incident_type="Overcurrent Warning", confidence="LOW")

    # Rule 11 — Firebase-level alert passthrough
    if fb_status and fb_status.upper() == "ALERT":
        return DetectionResult(is_incident=True, incident_type="Firebase Alert", confidence="MEDIUM")

    # All clear
    return DetectionResult(is_incident=False)
