# AEGIS AI Incident Commander — Implementation Plan

## System Overview

**AEGIS** is a campus emergency safety system that uses a layered AI architecture to transform raw sensor data into actionable intelligence. The core principle: the AI never sees raw sensor values — only structured incident packages.

## Key Decisions (from /grill-me interview)

| Area | Decision |
|---|---|
| **Scale** | Prototype / Hackathon — 1–5 ESP32 nodes, **2 buildings demo** |
| **Primary AI** | Gemini API (17 rotating API keys for rate limit management) |
| **Fallback AI** | Ollama — **Qwen2.5 (0.5B)** |
| **Backend** | FastAPI + MongoDB |
| **ESP32 Transport** | HTTP POST → FastAPI endpoint |
| **External App Communication** | REST (queries) + WebSocket (live alerts) |
| **Auth** | None — hackathon demo |
| **Occupancy** | YOLO v8n + ByteTrack virtual line crossing (1 real webcam + 1 simulated) |
| **Weather** | Removed — not needed |
| **Event Detection** | Hybrid: backend rules trigger AI; AI decides final severity |
| **PDF Reports** | Skip — show report in dashboard only |
| **Scope** | ⚡ **AI Brain only** — receives sensor + vision data, makes decisions, pushes structured JSON to app backend |
| **Frontend** | Not built here — consumed by external app backend |

---

## Architecture

```
╔══════════════════════════════════════╗
║  YOLO Microservice (Python script)   ║
║  Webcam → YOLOv8n + ByteTrack        ║
║  Virtual Line Crossing → IN/OUT cnt  ║
║  HTTP POST /api/v1/occupancy every 1s║
╚══════════════════════════════════════╝
                   │
                   ▼
ESP32 Nodes ──→  [1] FastAPI Ingest Endpoints
(HTTP POST)        │    ├── /api/v1/sensor/ingest
                   │    └── /api/v1/occupancy
                   ▼
              [2] Sensor Validation
                   │
                   ▼
              [3] Sensor Fusion Engine      (raw → labeled values)
                   │
                   ▼
              [4] Event Detection Engine    (rules → trigger AI?)
                   │
          ┌────────┴──────────┐
    No event                Event detected
    Store + skip AI              │
                                 ▼
                    [5] Incident Package Builder
                        (sensor_summary + occupancy)
                                 │
                                 ▼
                    [6] AI Router
                        (17 Gemini keys → Ollama fallback)
                                 │
                                 ▼
                    [7] Gemini / Ollama
                        (Incident Commander)
                                 │
                                 ▼
                    [8] AI Response Validator
                        (retry up to 2x)
                                 │
                                 ▼
                    [9] MongoDB
                        (incidents, sensor logs, occupancy)
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                     ▼
    [10] REST API Endpoints           WebSocket Event Broadcaster
         (query, chat, reports)       (live alerts to dashboard/app)
```

---

## Proposed File Structure

```
aegis-backend/                     ← FastAPI Brain
├── main.py                        # FastAPI app entrypoint
├── config.py                      # Settings, Gemini key pool, MongoDB URI
├── requirements.txt
│
├── api/
│   ├── sensor.py                  # POST /api/v1/sensor/ingest
│   ├── occupancy.py               # POST /api/v1/occupancy  ← YOLO pushes here
│   ├── incident.py                # GET  /api/v1/incidents/{id}
│   ├── chat.py                    # POST /api/v1/chat
│   └── status.py                  # GET  /api/v1/campus/status
│
├── core/
│   ├── fusion.py                  # Sensor Fusion Engine
│   ├── detection.py               # Event Detection Engine
│   ├── incident_builder.py        # Incident Package Builder (includes occupancy)
│   └── validator.py               # AI Response Validator
│
├── ai/
│   ├── router.py                  # Gemini key pool + Ollama fallback
│   ├── gemini_client.py           # Gemini API wrapper
│   ├── ollama_client.py           # Ollama local LLM wrapper
│   ├── prompts.py                 # System prompt definitions
│   └── incident_commander.py     # AI Incident Commander logic
│
├── db/
│   ├── mongo.py                   # MongoDB connection
│   ├── models.py                  # Pydantic models (Incident, SensorReading, OccupancyReading)
│   └── repositories.py            # CRUD operations
│
└── websocket/
    └── broadcaster.py             # WebSocket event broadcaster

aegis-vision/                      ← YOLO Microservice (standalone Python)
├── main.py                        # Entry point — starts all camera workers
├── config.py                      # Camera config: {cam_id, building, line_coords}
├── requirements.txt               # ultralytics, opencv-python, httpx
│
├── tracker/
│   ├── line_crossing.py           # Virtual line crossing logic (IN/OUT counter)
│   └── yolo_worker.py             # Per-camera YOLO+ByteTrack loop
│
└── simulator/
    └── fake_occupancy.py          # Simulates counts for building 2 (no camera)
```

---

## Component Breakdown

### [1] Sensor Ingest Endpoint
- `POST /api/v1/sensor/ingest`
- Accepts ESP32 payload (node_id, temperature, smoke, gas, current, motion, panic_button)
- Validates required fields + data types
- Triggers the pipeline asynchronously

### [2] Sensor Validation
- Reject readings with missing required fields
- Reject physically impossible values (e.g., temperature > 1000°C)
- Log invalid readings to MongoDB for debugging

### [3] Sensor Fusion Engine
Converts raw numbers into semantic labels:
```python
smoke: 382 → "HIGH"   # if > 300
temp: 54   → 54       # kept as number
gas: 95    → "LOW"    # if < 150
current: 14.6 → "ABNORMAL"  # if > 10A (configurable threshold)
```
Produces a structured `FusedReading` object.

### [4] Event Detection Engine (Hybrid)
Rule-based trigger conditions:
| Condition | Incident Type |
|---|---|
| Smoke HIGH + Temp > 50 | Possible Fire |
| Gas HIGH | Gas Leak |
| Current ABNORMAL + Smoke HIGH | Electrical Fire |
| panic_button = true | Manual Emergency |
| All normal | No incident → skip AI |

If triggered → proceeds to Incident Package Builder.

### [5] Incident Package Builder
Assembles the full structured JSON for the AI:
```json
{
  "incident_id": "INC_20260724_001",
  "timestamp": "...",
  "building": "Engineering Block",
  "floor": 1,
  "incident_type": "Possible Fire",
  "sensor_summary": { ... },
  "occupancy": { "estimated_people": 18 },
  "weather": { "wind": "LOW", "humidity": 43 }
}
```

### [6] AI Router — Gemini Key Pool + Ollama Fallback
- Round-robin through 17 Gemini API keys
- Track per-key usage & rate limit state
- If all Gemini keys are exhausted → fallback to local Ollama
- Configurable via `config.py`

### [7] AI Incident Commander (Gemini / Ollama)
Two modes:
1. **Incident Analysis** — triggered by backend event detection
2. **Chatbot Q&A** — triggered by user question (includes current incident + chat history)

System prompt enforces:
- JSON-only output
- Never invent sensor values
- Must include: type, severity, confidence, cause, advisory, responders

### [8] AI Response Validator
- Check required JSON keys present
- Check severity is a valid enum value
- Check confidence is 0–100
- If invalid → retry up to 2 times → store error incident if still invalid

### [9] MongoDB Collections
| Collection | Purpose |
|---|---|
| `sensor_readings` | Raw ESP32 payloads |
| `fused_readings` | Post-fusion labeled data |
| `incidents` | Full incident packages + AI analysis |
| `occupancy_readings` | Per-building IN/OUT counts from YOLO |
| `chat_sessions` | Per-user conversation history |
| `campus_status` | Per-building current status + live occupancy |

### [10] REST API Endpoints

The brain exposes two categories of APIs:

**Ingest APIs** (receive data from ESP32 + YOLO):

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/sensor/ingest` | ESP32 data ingestion |
| POST | `/api/v1/occupancy` | YOLO microservice pushes count every 1s |

**Output APIs** (serve decisions to app backend):

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/campus/status` | All buildings status + live occupancy |
| GET | `/api/v1/incidents/{id}` | Single incident detail + AI analysis |
| GET | `/api/v1/incidents` | Recent incidents list |
| POST | `/api/v1/chat` | User sends chatbot message → AI replies |
| GET | `/api/v1/report/{incident_id}` | Incident report (JSON) |
| WS | `/ws/alerts` | Live push: new incidents/updates |

### [11] WebSocket — Live Alerts
- `WS /ws/alerts`
- Broadcasts when a new incident is created or updated
- Payload: `{ status, building, floor, title, message }`
- Clients (dashboard/flutter) subscribe and receive live push

### [12] Conversation Context Management
Per the design — every chatbot message is processed with:
```
System Prompt
      ↓
Current Campus Status (from DB)
      ↓
Active Incident JSON (if any)
      ↓
Building Status Map
      ↓
Conversation History (last 5–10 turns)
      ↓
User Question
      ↓
Gemini / Ollama
```

---

## YOLO Vision Subsystem — Decisions Locked In

| Decision | Choice |
|---|---|
| **Camera type** | USB Webcam (1 real for Building 1, 1 simulated for Building 2) |
| **YOLO model** | YOLOv8n (nano) — fast enough on CPU |
| **Tracker** | ByteTrack (built into Ultralytics) |
| **Counting method** | Virtual line crossing (IN/OUT) |
| **Push frequency** | Every 1 second → `POST /api/v1/occupancy` |
| **Data sent** | `{ building, cam_id, people_inside, timestamp }` |
| **Camera-to-building map** | Static config (`config.py`) |
| **AI influence** | Occupancy raises urgency if Critical incident + people inside |
| **Deployment** | Standalone Python script (`aegis-vision/`) |
| **Weather** | ❌ Removed entirely |

---

## ✅ All Questions Resolved

| Question | Answer |
|---|---|
| Weather data | ❌ Removed |
| Occupancy source | YOLO v8n virtual line crossing |
| Ollama model | **Qwen2.5 (0.5B)** via Ollama |
| Node-to-building mapping | Static config dict in `config.py` |
| Buildings in demo | **2 buildings** |
| Cameras | 1 real webcam (Building 1) + 1 simulated (Building 2) |
| System scope | **AI Brain only** — outputs decisions to app backend |

---

## Verification Plan

### Automated
- Pytest: unit tests for Sensor Fusion and Event Detection engines
- Pytest: test AI Response Validator rejects bad JSON
- Pytest: test Gemini key rotation logic

### Manual
- Send simulated ESP32 payloads via Postman/curl
- Verify MongoDB documents are created correctly
- Verify WebSocket receives live alert
- Test chatbot Q&A flow end-to-end
- Test Ollama fallback by exhausting Gemini keys
