import urllib.request
import json

api_key = "AIzaSyBlNIVjTqOOwF7M2uTcgCr27Zba4ac-g_Y"
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

try:
    with urllib.request.urlopen(url, timeout=10) as response:
        models = json.loads(response.read().decode())
        for model in models.get('models', []):
            print(f"Name: {model['name']}, Methods: {model['supportedGenerationMethods']}")
except Exception as e:
    print(f"Error: {e}")
