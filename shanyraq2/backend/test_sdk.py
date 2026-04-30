import google.generativeai as genai
import os
import sys

api_key = "AIzaSyDmMVD8QWJDDLmX64GLNtQh-Ovs6jMIoT4"
genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-pro')

system_text = "SYSTEM CONTEXT: You are a helpful assistant"

contents = []
contents.append({"role": "user", "parts": [system_text]})
contents.append({"role": "model", "parts": ["Понял Вас. Я — Ваш персональный консьерж. Чем могу помочь?"]})
contents.append({"role": "user", "parts": ["привет"]})
contents.append({"role": "model", "parts": ["Добро пожаловать!"]})
contents.append({"role": "user", "parts": ["найди мне дом"]})

try:
    response = model.generate_content(
        contents,
        generation_config=genai.types.GenerationConfig(
            temperature=0.7,
            max_output_tokens=1024,
        )
    )
    print("SUCCESS")
    print(response.text)
except Exception as e:
    print(f"ERROR: {e}")
