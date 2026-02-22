import requests
import json
from datetime import date

URL = "http://127.0.0.1:8050/generate-summary"

payload = {
    "patient_id": "P-TEST-99",
    "patient_name": "Sahil Khaire",
    "preferred_language": "Marathi",
    "doctor_name": "Dr. Smith",
    "clinic_name": "City Wellness Center",
    "clinic_phone": "+1234567890",
    "clinic_address": "123 Healthcare Ave, Metro City",
    "visit_date": str(date.today()),
    "risk_status": "GREEN",
    "phone_number": "+917499321239",
    "email": "sahilkhaire6.6.2006@gmail.com",
    "medical_knowledge": [
        {
          "disease": "Hypertension",
          "icd_code": "I10",
          "disease_details": {
            "disease_name": "Hypertension",
            "icd_code": "I10",
            "what_is_wrong": "Hypertension is a chronic condition characterized by consistently elevated blood pressure (>=130/80 mmHg).",
            "precautions": ["Reduce sodium intake", "Manage stress"],
            "medications": ["Amlodipine 5mg"],
            "diet_specifications": ["DASH diet", "Low salt"],
            "what_to_do": ["Monitor BP daily", "Take meds"],
            "rehab_options": ["Cardiac rehab"],
            "recommended_followup_days": {"routine": 30}
          }
        }
    ],
    "clinical_findings": {
      "chief_complaint": "headache for the past three days",
      "vitals": {
        "blood_pressure": "148/92",
        "heart_rate": "88"
      },
      "history_of_present_illness": "Patient reports throbbing headache.",
      "objective_findings": "BP elevated at 148/92.",
      "assessment": "Stage 2 Hypertension.",
      "plan": "Start Amlodipine 5mg daily. Low salt diet."
    }
}

def run_test():
    print(f"Sending real-time agentic request for {payload['patient_name']}...")
    try:
        response = requests.post(URL, json=payload)
        print(f"Status: {response.status_code}")
        print("Final Output Logic Check:")
        data = response.json()
        if response.status_code == 200:
            print("✅ Report Generated Successfully!")
            print(f"Summary (Agentic): {data.get('summary_text', '')[:150]}...")
            print(f"SMS Status: {data.get('sms_status')}")
            print(f"Email Status: {data.get('email_status')}")
            if data.get('errors'):
                print("⚠️ Errors reported:")
                for err in data['errors']:
                    print(f"  - {err}")
        else:
            print(f"❌ Server Error (500): {data}")
    except Exception as e:
        print(f"Execution Error: {e}")

if __name__ == "__main__":
    run_test()
