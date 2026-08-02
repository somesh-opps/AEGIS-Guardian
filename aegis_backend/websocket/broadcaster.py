"""
WebSocket Connection Manager — broadcasts live incident alerts to all
connected clients (dashboard, Flutter app, etc.).
"""
from __future__ import annotations
import logging
from fastapi import WebSocket

logger = logging.getLogger("aegis.ws")


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.append(websocket)
        logger.info(f"[WS] Client connected. Total: {len(self._connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self._connections:
            self._connections.remove(websocket)
        logger.info(f"[WS] Client disconnected. Total: {len(self._connections)}")

    async def broadcast(self, payload: dict) -> None:
        """Send JSON payload to all connected WebSocket clients."""
        dead: list[WebSocket] = []
        for ws in self._connections:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


# Singleton used across all routers
manager = ConnectionManager()
