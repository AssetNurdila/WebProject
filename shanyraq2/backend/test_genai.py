import os
from google import genai
from google.genai import types

api_key = "AIzaSyDmMVD8QWJDDLmX64GLNtQh-Ovs6jMIoT4"
client = genai.Client(api_key=api_key)

try:
    response = client.models.generate_content(
        model='gemini-1.0-pro',
        contents='Tell me a joke.'
    )
    print("SUCCESS")
    print(response.text)
except Exception as e:
    print(f"ERROR: {e}")
