import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGO_URI, DB_NAME

async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    print("--- campus_status ---")
    async for doc in db.campus_status.find():
        print(doc)
    print("--- incidents ---")
    async for doc in db.incidents.find():
        print(doc)
    print("--- fused_readings (last 2) ---")
    async for doc in db.fused_readings.find().sort("timestamp", -1).limit(2):
        print(doc)

if __name__ == "__main__":
    asyncio.run(main())
