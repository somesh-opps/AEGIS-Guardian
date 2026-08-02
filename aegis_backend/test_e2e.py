"""
AEGIS AI Brain — End-to-End Integration Verification Test
Simulates occupancy push and triggers a Firebase sensor sync.
Verifies building status updates, incident logs, and Chatbot Q&A.

Run: .\venv\Scripts\python test_e2e.py
"""
import httpx
import json

BASE = "http://localhost:8000"

# ── Test 1: YOLO Occupancy Push ────────────────────────────────
print("=== Test 1: YOLO Occupancy Push ===")
occ_payload = {
    "building": "Academic Block",
    "cam_id": "CAM_ACAD_ENTRANCE",
    "people_inside": 15,
    "timestamp": "2026-07-26T00:00:00Z"
}
r = httpx.post(
    f"{BASE}/api/v1/occupancy",
    json=occ_payload,
    headers={"x-vision-secret": "aegis-vision-secret"}
)
print(f"  Status: {r.status_code}")
print(f"  Response: {r.json()}")

# ── Test 2: Trigger Firebase Sync ──────────────────────────────
print("\n=== Test 2: Triggering Firebase RTDB Sensor Sync ===")
r = httpx.post(f"{BASE}/api/v1/sensor/firebase-sync", timeout=60.0)
print(f"  Status: {r.status_code}")
data = r.json()
print(f"  Processed Nodes: {data.get('nodes_processed')}")
print(f"  Details: {json.dumps(data.get('details', []), indent=2)}")

# ── Test 3: Check Campus Status ────────────────────────────────
print("\n=== Test 3: Campus Status After Sync ===")
r = httpx.get(f"{BASE}/api/v1/campus/status")
print(f"  Status: {r.status_code}")
print(f"  Response: {json.dumps(r.json(), indent=2)}")

# ── Test 4: Fetch Incidents List ───────────────────────────────
print("\n=== Test 4: Fetch Recent Incidents ===")
r = httpx.get(f"{BASE}/api/v1/incidents?limit=5")
print(f"  Status: {r.status_code}")
incidents = r.json().get("incidents", [])
print(f"  Count: {len(incidents)}")
if incidents:
    first = incidents[0]
    print(f"  Latest Incident ID  : {first.get('incident_id')}")
    print(f"  Type                : {first.get('incident_type')}")
    print(f"  Building/Room       : {first.get('building')} / {first.get('room')}")
    print(f"  Status              : {first.get('status')}")
    if first.get("ai_analysis"):
        ai = first["ai_analysis"]
        print(f"  AI Severity         : {ai.get('incident', {}).get('severity')}")
        print(f"  AI Public Advisory  : {ai.get('public_advisory', {}).get('message')}")

# ── Test 5: Chatbot Q&A ────────────────────────────────────────
print("\n=== Test 5: Chatbot Q&A ===")
r = httpx.post(
    f"{BASE}/api/v1/chat",
    json={"question": "What is the status of the Academic Block?"},
    timeout=60.0
)
print(f"  Status: {r.status_code}")
chat = r.json()
print(f"  Source : {chat.get('source')}")
print(f"  Answer : {chat.get('answer')}")

print("\n=== All E2E Verification Tests Complete ===")
