"""
AEGIS AI Brain — FastAPI Application Entry Point
Firebase is the sole sensor source. ESP32 ingest endpoint removed.
"""
from __future__ import annotations
import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from db.mongo import connect_db, close_db, get_db
from websocket.broadcaster import manager
from api import sensor, occupancy, incident, chat, status
from services.firebase_service import start_firebase_loop, stop_firebase_loop

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)


# ── Lifespan: connect MongoDB & start Firebase Poller ─────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    
    # Clean up stale database records and start with a fresh state
    db = get_db()
    await db.campus_status.delete_many({})
    await db.incidents.delete_many({})
    await db.occupancy_readings.delete_many({})
    await db.sensor_readings.delete_many({})
    await db.fused_readings.delete_many({})

    # Seed default SAFE status for every known building so the dashboard
    # always shows buildings immediately on startup (before vision/Firebase data arrives)
    from db.models import BuildingStatus
    from db import repositories as repo
    from config import NODE_BUILDING_MAP
    seeded = set()
    for node_info in NODE_BUILDING_MAP.values():
        building = node_info["building"] if isinstance(node_info, dict) else node_info
        if building not in seeded:
            await repo.upsert_building_status(db, BuildingStatus(building=building, status="SAFE", people_inside=0))
            seeded.add(building)

    bg_task = asyncio.create_task(start_firebase_loop())
    yield
    stop_firebase_loop()
    bg_task.cancel()
    await close_db()


# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="AEGIS AI Brain",
    description=(
        "AI-powered campus emergency incident commander.\n\n"
        "Polls Firebase RTDB for sensor data from campus nodes. "
        "Fuses data, detects events, calls Gemini (with Qwen2.5 fallback), validates the response, "
        "stores to MongoDB, and pushes live alerts over WebSocket."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
app.include_router(sensor.router)
app.include_router(occupancy.router)
app.include_router(incident.router)
app.include_router(chat.router)
app.include_router(status.router)


# ── WebSocket Alert Stream ────────────────────────────────────
@app.websocket("/ws/alerts")
async def ws_alerts(websocket: WebSocket):
    """
    Live alert stream. Connect to receive real-time incident broadcasts.
    """
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ── Health Check ─────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "service": "AEGIS AI Brain v2.0 (Firebase)"}


# ── Dashboard — serve index.html at root and /dashboard ───────
_static_dir = os.path.join(os.path.dirname(__file__), "static")
_index_path = os.path.join(_static_dir, "index.html")


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
@app.get("/dashboard", response_class=HTMLResponse, include_in_schema=False)
async def serve_dashboard():
    if os.path.exists(_index_path):
        with open(_index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>AEGIS AI Brain — static/index.html not found</h1>", status_code=500)


# ── Static file mount (CSS, JS, images if any) ───────────────
if os.path.exists(_static_dir):
    app.mount("/assets", StaticFiles(directory=_static_dir), name="assets")
