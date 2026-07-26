# 🛡️ AEGIS Guardian

> **A**I-Powered **E**mergency **G**uardian & **I**ncident **S**ystem — Real-time campus safety intelligence platform combining IoT sensor fusion, computer vision, and multi-model AI reasoning.

---

## 🧠 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AEGIS GUARDIAN                          │
│                                                             │
│  ┌─────────────────┐      ┌──────────────────────────────┐  │
│  │  aegis-vision   │      │       aegis-backend          │  │
│  │  ─────────────  │      │  ─────────────────────────── │  │
│  │  YOLO v8 People │─────▶│  FastAPI  ·  MongoDB         │  │
│  │  Counter        │      │  Gemini AI ·  Firebase Sync  │  │
│  │  (Per Camera)   │      │  Incident Engine             │  │
│  └─────────────────┘      └──────────────────────────────┘  │
│                                       ▲                      │
│                             IoT Sensor Data                  │
│                         (Smoke · Gas · Temp · Current)       │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Features

| Module | Capability |
|--------|-----------|
| **Sensor Fusion** | Real-time smoke, gas, temperature, humidity & current monitoring via Firebase |
| **AI Brain** | Multi-model reasoning (Gemini API pool + Ollama fallback) for incident classification |
| **Computer Vision** | YOLO v8 people counting with virtual tripwire line crossing detection |
| **Incident Engine** | Auto-generates structured incident reports with severity scoring |
| **WebSocket API** | Live push to dashboards — sub-second latency |
| **REST API** | Full OpenAPI-documented endpoints for sensors, incidents, and occupancy |

---

## 📁 Project Structure

```
hekafalls-2026/
├── aegis-backend/          # FastAPI AI brain
│   ├── ai/                 # Gemini + Ollama clients, prompt engineering
│   ├── api/                # REST endpoints (sensors, incidents, occupancy)
│   ├── core/               # Incident builder, sensor fusion logic
│   ├── db/                 # MongoDB models & repositories
│   ├── services/           # Firebase sync, background workers
│   ├── websocket/          # Live dashboard WebSocket hub
│   ├── static/             # Frontend dashboard (index.html)
│   ├── config.py.example   # ← Copy to config.py and fill in secrets
│   ├── .env.example        # ← Copy to .env and fill in secrets
│   └── requirements.txt
│
├── aegis-vision/           # YOLO v8 people counting service
│   ├── tracker/            # Centroid tracker + OpenCV/YOLO workers
│   ├── simulator/          # Fake occupancy data for testing
│   ├── config.py.example   # ← Copy to config.py and fill in secrets
│   └── requirements.txt
│
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- MongoDB Atlas account (or local MongoDB)
- Gemini API key(s) from [Google AI Studio](https://aistudio.google.com/)
- Firebase Realtime Database project (for IoT sensor data)

### 1. Clone the Repository

```bash
git clone https://github.com/somesh-opps/AEGIS-Guardian.git
cd AEGIS-Guardian
```

### 2. Setup `aegis-backend`

```bash
cd aegis-backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure secrets
cp config.py.example config.py
# → Open config.py and fill in your MONGO_URI, GEMINI_API_KEYS, FIREBASE_RTDB_URL etc.

# Start the backend
python main.py
# API available at http://localhost:8000
# Dashboard at    http://localhost:8000/static/index.html
```

### 3. Setup `aegis-vision`

```bash
cd aegis-vision

python -m venv venv
venv\Scripts\activate

pip install -r requirements.txt

# Configure secrets
cp config.py.example config.py
# → Set VISION_SECRET to match the backend, configure camera sources

# Start the vision service
python main.py
```

---

## 🔑 Configuration

### Secrets — `config.py` (gitignored)

Both services use a `config.py` file for secrets. **This file is gitignored and must never be committed.**

| File | Template | What to fill in |
|------|----------|-----------------|
| `aegis-backend/config.py` | `config.py.example` | MongoDB URI, Gemini API keys, Firebase URL |
| `aegis-vision/config.py` | `config.py.example` | Backend URL, camera sources, shared secret |

### Sensor Thresholds

Configurable in `aegis-backend/config.py`:

```python
THRESHOLDS = {
    "smoke":       {"LOW": (0, 149), "MEDIUM": (150, 299), "HIGH": (300, 9999)},
    "gas":         {"LOW": (0, 149), "MEDIUM": (150, 299), "HIGH": (300, 9999)},
    "temperature": {"NORMAL": (0, 39), "ELEVATED": (40, 49), "HIGH": (50, 999)},
}
```

---

## 🤖 AI Engine

AEGIS uses a **Gemini API key pool** for high-throughput AI reasoning with automatic fallback to a local **Ollama** model if all Gemini keys are exhausted or unavailable.

```
Gemini API Key 1 → Key 2 → ... → Key N → Ollama (qwen2.5:0.5b)
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/incidents` | List all incidents |
| `POST` | `/api/v1/sensors` | Ingest sensor reading |
| `GET` | `/api/v1/occupancy` | Current building occupancy |
| `POST` | `/api/v1/occupancy` | Push vision occupancy count |
| `WS` | `/ws` | Live WebSocket stream |

Full interactive docs: `http://localhost:8000/docs`

---

## 🛡️ Security Notes

- `config.py` is **gitignored** — never committed
- All secrets loaded at runtime from local config
- Shared secret authentication between vision ↔ backend services
- MongoDB Atlas network access controls recommended

---

## 📄 License

This project is part of the **Hekafalls 2026** research initiative.
