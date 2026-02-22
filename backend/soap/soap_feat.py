import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

GROK_API_KEY = os.getenv("GROK_API_KEY")

# -------------------------------
# 1️⃣ Transcription using Grok Whisper
# -------------------------------
def transcribe_audio_with_grok(audio_path):
    api_key = os.getenv("GROK_API_KEY")
    if not api_key:
        raise ValueError("GROK_API_KEY not set in .env")

    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    transcription_model = os.getenv("GROQ_TRANSCRIPTION_MODEL", "whisper-large-v3-turbo")

    with open(audio_path, "rb") as audio:
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {GROK_API_KEY}"
            },
            files={"file": audio},
            data={
                "model": transcription_model
            },
            timeout=60
        )

    print("Transcription Response:", response.text)

    if not response.ok:
        raise Exception(f"Groq transcription error: {response.status_code} - {response.text}")

    text = response.json().get("text")
    if not text:
        raise Exception("Transcription returned empty text")

    return text


# -------------------------------
# 2️⃣ Generate SOAP JSON
# -------------------------------
def generate_soap_from_text(transcription):
    api_key = os.getenv("GROK_API_KEY")
    if not api_key:
        raise ValueError("GROK_API_KEY not set in .env")

    url = "https://api.groq.com/openai/v1/chat/completions"

    prompt = f"""
Convert the following clinical transcription into STRICT JSON.

Use EXACTLY this schema:

{{
"chief_complaint": "",
"history_of_present_illness": "",
"past_medical_history": "",
"medications": "",
"allergies": "",
"vitals": {{
"blood_pressure": "",
"heart_rate": "",
"respiratory_rate": "",
"temperature": "",
"oxygen_saturation": ""
}},
"objective_findings": "",
"assessment": "",
"plan": ""
}}

Rules:
- Return ONLY valid JSON
- No explanations
- No markdown
- If missing, use empty string ""

Transcription:
{transcription}
"""

    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {GROK_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0
        }
    )

    print("Chat Response:", response.text)

    data = response.json()

    if "choices" not in data:
        raise Exception(f"Grok API Error: {data}")

    soap_json_string = data["choices"][0]["message"]["content"]

    return json.loads(soap_json_string)


# -------------------------------
# TEST BLOCK
# -------------------------------
if __name__ == "__main__":

    soap_json = generate_soap_from_text("""Doctor: What brings you in today?

Patient: I've been having a headache for the past three days...

Blood pressure is 148 over 92.
Heart rate is 88 beats per minute.
Respiratory rate is 18 per minute.
Temperature is 98.6 degrees Fahrenheit.
Oxygen saturation is 98 percent.
""")

    print(json.dumps(soap_json, indent=2))