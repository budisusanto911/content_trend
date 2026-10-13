import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path="content-trend-intelligence/.env")
AI_API_KEY = os.environ.get("AI_API_KEY", "")
genai.configure(api_key=AI_API_KEY)

try:
    print("Available models:")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print("Error:", e)

