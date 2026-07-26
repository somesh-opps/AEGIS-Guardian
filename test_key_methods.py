import os

# Load key from environment — never hardcode secrets in source files
# Set via: $env:GEMINI_TEST_KEY = "your_key_here"  (PowerShell)
#       or: export GEMINI_TEST_KEY=your_key_here    (bash)
key = os.environ.get("GEMINI_TEST_KEY", "")
if not key:
    raise ValueError("GEMINI_TEST_KEY environment variable is not set.")

async def test_auth():
    print("Testing Method 1: x-goog-api-key header...")
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
            headers={"x-goog-api-key": key, "Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": "Hi"}]}]}
        )
        print("M1 Status:", r.status_code, r.text[:200])

    print("\nTesting Method 2: Authorization Bearer header...")
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": "Hi"}]}]}
        )
        print("M2 Status:", r.status_code, r.text[:200])

    print("\nTesting Method 3: URL param ?key=...")
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}",
            headers={"Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": "Hi"}]}]}
        )
        print("M3 Status:", r.status_code, r.text[:200])

asyncio.run(test_auth())
