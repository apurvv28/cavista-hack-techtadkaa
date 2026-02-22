import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

GROK_API_KEY = os.getenv("GROK_API_KEY")


def analyze_red_flags(soap_json):
    """
    AI-driven red flag detection.
    No static rules.
    Fully dynamic clinical reasoning using Groq.
    """
    api_key = os.getenv("GROK_API_KEY")
    if not api_key:
        raise ValueError("GROK_API_KEY not set in .env")

    url = "https://api.groq.com/openai/v1/chat/completions"

    system_prompt = """
You are an advanced clinical safety AI.

Your task:
Analyze structured SOAP JSON and detect ANY potential red-flag conditions.

Red flags include but are not limited to:
- Life-threatening vitals
- Severe hypertension
- Hypoxia
- Sepsis patterns
- Stroke patterns
- Cardiac emergencies
- Neurological emergencies
- Severe infections
- Unstable vitals

Rules:
- Use only the provided SOAP data
- Do NOT assume missing data
- If no red flags, return {"alerts": []}
- Return ONLY valid JSON
- No explanations
- No markdown

Output format:

{
  "alerts": [
    {
      "type": "SHORT_ALERT_NAME",
      "severity": "moderate | high | critical",
      "reason": "clear short explanation",
      "recommended_action": "brief clinical recommendation"
    }
  ],
  "alert_count": number
}
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
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(soap_json)}
            ],
            "temperature": 0
        },
        timeout=20
    )

    data = response.json()

    if "choices" not in data:
        raise Exception(f"Groq API Error: {data}")

    content = data["choices"][0]["message"]["content"]

    try:
        parsed = json.loads(content)
        return parsed
    except json.JSONDecodeError:
        # fallback safety
        return {
            "alerts": [],
            "alert_count": 0
        }


# =====================================================
# TEST CASE
# =====================================================

if __name__ == "__main__":

    test_case = {
        "chief_complaint": "sudden severe headache with vision loss",
        "history_of_present_illness": "",
        "vitals": {
            "blood_pressure": "185/122",
            "heart_rate": "120",
            "respiratory_rate": "22",
            "temperature": "102.5",
            "oxygen_saturation": "89"
        },
        "objective_findings": "",
        "assessment": "",
        "plan": ""
    }

    result = analyze_red_flags(test_case)
    print(json.dumps(result, indent=2))