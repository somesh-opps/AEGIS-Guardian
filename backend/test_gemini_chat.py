import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
raw_keys = os.getenv("GEMINI_API_KEYS", "")
keys = [k.strip() for k in raw_keys.split(",") if k.strip()]

genai.configure(api_key=keys[0])
model = genai.GenerativeModel('gemini-3.5-flash')
try:
    response = model.generate_content("hello")
    print(response.text)
except Exception as e:
    print("Error:", e)
