"""
MongoDB async connection (Motor driver).
Call connect_db() on startup, close_db() on shutdown.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from config import MONGO_URI, DB_NAME

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    global _client, _db
    _client = AsyncIOMotorClient(MONGO_URI)
    _db = _client[DB_NAME]
    # Ping to validate connection
    await _db.command("ping")
    print(f"[DB] Connected to MongoDB — database: {DB_NAME}")


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        print("[DB] MongoDB connection closed.")


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialised. Call connect_db() first.")
    return _db
