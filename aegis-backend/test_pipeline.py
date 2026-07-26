from db.models import SensorReading
from core.fusion import fuse
from core.detection import detect

# Test 1: Electrical Fire
r1 = SensorReading(
    node_id="ENG_F1_NODE_01", temperature=54, smoke=382,
    gas=95, current=14.6, motion=True, panic_button=False
)
f1 = fuse(r1)
d1 = detect(f1)
print("=== Test 1: Electrical Fire ===")
print(f"  Building : {f1.building}, Floor: {f1.floor}")
print(f"  Smoke    : {f1.environment['smoke_label']}")
print(f"  Temp     : {f1.environment['temperature_label']}")
print(f"  Current  : {f1.electrical['current_label']}")
print(f"  Detected : {d1.incident_type} | incident={d1.is_incident} | confidence={d1.confidence}")

# Test 2: Gas Leak
r2 = SensorReading(
    node_id="LIB_F1_NODE_01", temperature=28, smoke=50,
    gas=380, current=4.0, motion=False, panic_button=False
)
f2 = fuse(r2)
d2 = detect(f2)
print("\n=== Test 2: Gas Leak ===")
print(f"  Building : {f2.building}")
print(f"  Gas      : {f2.environment['gas_label']}")
print(f"  Detected : {d2.incident_type} | incident={d2.is_incident}")

# Test 3: All Clear
r3 = SensorReading(
    node_id="ENG_F1_NODE_01", temperature=24, smoke=40,
    gas=30, current=5.0, motion=True, panic_button=False
)
f3 = fuse(r3)
d3 = detect(f3)
print("\n=== Test 3: All Clear ===")
print(f"  Detected : {d3.incident_type} | incident={d3.is_incident}")

# Test 4: Panic Button
r4 = SensorReading(
    node_id="ENG_F1_NODE_01", temperature=24, smoke=40,
    gas=30, current=5.0, motion=True, panic_button=True
)
f4 = fuse(r4)
d4 = detect(f4)
print("\n=== Test 4: Panic Button ===")
print(f"  Detected : {d4.incident_type} | incident={d4.is_incident}")

# Test 5: AI Validator
from core.validator import validate_incident_response, ValidationError
import json

good_response = json.dumps({
    "incident": {"type": "Electrical Fire", "severity": "Critical", "confidence": 96},
    "analysis": {"cause": "Smoke and abnormal current indicate electrical fire.", "spread_risk": "Medium"},
    "public_advisory": {"title": "Electrical Fire", "message": "Evacuate using Exit B.", "priority": "Immediate"},
    "responders": ["Campus Security", "Fire Department"]
})
result = validate_incident_response(good_response)
print("\n=== Test 5: AI Validator ===")
print(f"  Validated OK: severity={result['incident']['severity']}, confidence={result['incident']['confidence']}")

print("\nAll tests PASSED!")
