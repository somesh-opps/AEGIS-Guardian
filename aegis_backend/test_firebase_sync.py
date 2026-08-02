"""
Test script for Firebase Realtime Database integration.
Fetches live data from https://synapse-d120d-default-rtdb.asia-southeast1.firebasedatabase.app/
and runs it through the AEGIS pipeline.

Run: .\venv\Scripts\python test_firebase_sync.py
"""
import asyncio
import json
from db.mongo import connect_db, close_db
from services.firebase_service import fetch_and_process_firebase_sensors

async def main():
    print("=== Testing Firebase Realtime Database Sensor Sync ===")
    await connect_db()
    try:
        res = await fetch_and_process_firebase_sensors()
        print(f"\nStatus: {res.get('status')}")
        print(f"Nodes Processed: {res.get('nodes_processed')}")
        print("\nDetails:")
        print(json.dumps(res.get('details', []), indent=2))
    finally:
        await close_db()
    print("\n=== Firebase Sync Test Completed Successfully ===")

if __name__ == "__main__":
    asyncio.run(main())
