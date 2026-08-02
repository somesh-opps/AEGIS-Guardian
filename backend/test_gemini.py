import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
raw_keys = os.getenv("GEMINI_API_KEYS", "")
keys = [k.strip() for k in raw_keys.split(",") if k.strip()]
print(f"Found {len(keys)} keys")

if keys:
    genai.configure(api_key=keys[0])
    print(f"Testing key: {keys[0][:10]}...")
    try:
        models = genai.list_models()
        for m in models:
            print(m.name, m.supported_generation_methods)
    except Exception as e:
        print("Error:", e)
