"""
Multi-Agent Symptom Assessment System

This system simulates multi-agent orchestration to:
1. Detect the user's language
2. Predict diseases based on symptoms
3. Combine results and provide output in user's language

Currently implemented with basic orchestration - can be upgraded to CrewAI + LangGraph
"""

from typing import Dict, List, Any, TypedDict
import json
import os
import re
import requests
from dotenv import load_dotenv
from .language_detector import LanguageDetector
from .risk_assessor import RiskAssessor

load_dotenv()

# Load ICD codes for disease mapping
with open('icd_codes.json', 'r') as f:
    ICD_DATA = json.load(f)

class AgentState(TypedDict):
    """State for the multi-agent workflow"""
    user_input: str
    detected_language: str
    symptoms: List[str]
    disease_predictions: List[Dict[str, Any]]
    final_output: str
    confidence_scores: Dict[str, float]

class MultiAgentSymptomAssessor:
    """Multi-agent system for symptom assessment"""

    def __init__(self):
        # Initialize components
        self.language_detector = LanguageDetector()
        self.risk_assessor = RiskAssessor()
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.model = os.getenv("LLM_MODEL", "groq/llama-3.3-70b-versatile")

    def _detect_language_parallel(self, user_input: str) -> str:
        """Simulate parallel language detection"""
        print("🔍 Agent 1: Detecting language...")
        detected_lang = self.language_detector.detect_language(user_input)
        print(f"   Language detected: {detected_lang}")
        return "en"  # Simplified - return detected language code

    def _analyze_symptoms_parallel(self, user_input: str) -> List[str]:
        """Simulate parallel symptom analysis"""
        print("🔬 Agent 2: Analyzing symptoms...")
        # Extract symptoms from text (simplified)
        symptoms = []
        text_lower = user_input.lower()

        # Basic symptom detection
        symptom_keywords = {
            "fever": ["fever", "temperature", "hot", "chills"],
            "cough": ["cough", "coughing"],
            "headache": ["headache", "head pain", "migraine"],
            "fatigue": ["tired", "fatigue", "exhausted", "weak"],
            "nausea": ["nausea", "vomiting", "sick", "throw up"],
            "sore throat": ["sore throat", "throat pain"],
            "shortness of breath": ["shortness of breath", "breathing difficulty", "can't breathe"],
            "chest pain": ["chest pain", "chest hurts"],
            "dizziness": ["dizziness", "dizzy", "lightheaded"],
            "body aches": ["body aches", "muscle pain", "joint pain"]
        }

        for symptom, keywords in symptom_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                symptoms.append(symptom)

        if not symptoms:
            symptoms = ["general discomfort"]  # fallback

        print(f"   Symptoms identified: {', '.join(symptoms)}")
        return symptoms

    def _predict_diseases_with_groq(self, symptoms: List[str], user_input: str) -> List[Dict[str, Any]]:
        """Use Groq API for intelligent disease prediction"""
        print("🩺 Agent 3: Predicting diseases using Groq AI...")

        if not self.groq_api_key:
            print("   Warning: No Groq API key found, falling back to basic prediction")
            return self._fallback_disease_prediction(symptoms)

        # Prepare the prompt for Groq
        symptoms_text = ", ".join(symptoms)

        prompt = f"""You are a medical AI assistant specializing in symptom analysis and disease prediction.

Patient symptoms described: "{user_input}"
Extracted symptoms: {symptoms_text}

Based on these symptoms, predict the most likely diseases or conditions. Consider:
1. Common medical conditions that match these symptoms
2. Differential diagnosis (multiple possible conditions)
3. Probability estimates based on symptom patterns
4. Severity considerations

Return your analysis in the following JSON format:
{{
    "predictions": [
        {{
            "disease": "Disease Name",
            "probability": 0.85,
            "reasoning": "Brief explanation of why this disease matches the symptoms",
            "urgency": "high/medium/low",
            "recommendations": ["See doctor soon", "Monitor symptoms", "Rest and hydrate"]
        }}
    ]
}}

Important: 
- Focus on the most likely 3-5 conditions
- Probabilities should be realistic (0.0 to 1.0)
- Be medically accurate but remember this is not a diagnosis
- Include appropriate medical disclaimers in reasoning
- Consider symptom combinations and patterns

JSON Response:"""

        try:
            # Make API call to Groq
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": "You are a medical AI assistant. Always respond with valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1000
                },
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]

                # Clean the response - remove markdown code blocks if present
                if content is None:
                    content = ""
                content = content.strip()
                # Remove BOM and other leading invisible characters
                if content.startswith("\ufeff"):
                    content = content[1:]
                if content.startswith("```"):
                    # Remove opening ``` and optional language identifier (json, javascript, etc.)
                    content = content[3:].strip()
                    if content.startswith("json"):
                        content = content[4:].strip()
                    elif content.startswith("javascript"):
                        content = content[10:].strip()
                    # Remove closing ``` if present
                    if "```" in content:
                        content = content.split("```")[0].strip()

                # Parse the JSON response (skip if empty)
                if not content:
                    raise json.JSONDecodeError("Empty response", "", 0)

                try:
                    parsed_response = json.loads(content)
                    predictions = parsed_response.get("predictions", [])

                    # Validate and format predictions
                    formatted_predictions = []
                    for pred in predictions[:5]:  # Limit to top 5
                        formatted_pred = {
                            "disease": pred.get("disease", "Unknown Condition"),
                            "probability": min(1.0, max(0.0, pred.get("probability", 0.5))),
                            "reasoning": pred.get("reasoning", "Based on symptom analysis"),
                            "risk_level": self._get_risk_level_from_urgency(pred.get("urgency", "medium")),
                            "recommendations": pred.get("recommendations", ["Consult healthcare professional"])
                        }
                        formatted_predictions.append(formatted_pred)

                    if formatted_predictions:
                        print(f"   AI predicted {len(formatted_predictions)} conditions")
                        return formatted_predictions

                except json.JSONDecodeError as e:
                    print(f"   Error parsing Groq response: {e}")
                    print(f"   Raw response: {repr(content[:200])}...")
                    # Try to extract JSON from the content if it's embedded (find first {)
                    brace_start = content.find("{")
                    if brace_start >= 0:
                        content = content[brace_start:]
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        try:
                            parsed_response = json.loads(json_match.group())
                            predictions = parsed_response.get("predictions", [])
                            if predictions:
                                formatted_predictions = []
                                for pred in predictions[:5]:
                                    formatted_predictions.append({
                                        "disease": pred.get("disease", "Unknown Condition"),
                                        "probability": min(1.0, max(0.0, pred.get("probability", 0.5))),
                                        "reasoning": pred.get("reasoning", "Based on symptom analysis"),
                                        "risk_level": self._get_risk_level_from_urgency(pred.get("urgency", "medium")),
                                        "recommendations": pred.get("recommendations", ["Consult healthcare professional"])
                                    })
                                print(f"   Successfully extracted {len(formatted_predictions)} predictions using regex")
                                return formatted_predictions
                        except Exception:
                            pass

            else:
                print(f"   Groq API error: {response.status_code} - {response.text}")

        except Exception as e:
            print(f"   Error calling Groq API: {e}")

        # Fallback to basic prediction if API fails
        print("   Falling back to basic prediction method")
        return self._fallback_disease_prediction(symptoms)

    def _fallback_disease_prediction(self, symptoms: List[str]) -> List[Dict[str, Any]]:
        """Fallback disease prediction using the existing risk assessor"""
        symptoms_text = ", ".join(symptoms)
        risk_scores = self.risk_assessor.analyze_symptoms(symptoms_text)

        predictions = []
        for disease, score in list(risk_scores.items())[:5]:
            predictions.append({
                "disease": disease,
                "probability": score / 100.0,
                "reasoning": f"Based on symptoms: {symptoms_text}",
                "risk_level": self.risk_assessor.get_risk_level(score)
            })

        return predictions

    def _get_risk_level_from_urgency(self, urgency: str) -> str:
        """Convert urgency level to risk level"""
        urgency_map = {
            "high": "High Risk",
            "medium": "Medium Risk",
            "low": "Low Risk"
        }
        return urgency_map.get(urgency.lower(), "Medium Risk")

    def _predict_diseases_parallel(self, symptoms: List[str], user_input: str = "") -> List[Dict[str, Any]]:
        """Simulate parallel disease prediction using Groq API"""
        return self._predict_diseases_with_groq(symptoms, user_input)

    def _format_output_parallel(self, detected_language: str, symptoms: List[str],
                               predictions: List[Dict[str, Any]]) -> str:
        """Simulate parallel output formatting"""
        print("📝 Agent 4: Formatting output...")

        # Create patient-friendly output
        output = f"""
=== 🤖 AI Symptom Assessment Results ===

Hello! I've analyzed your symptoms using our multi-agent medical assessment system.

📋 **Symptoms You Described:**
{chr(10).join(f"• {symptom.title()}" for symptom in symptoms)}

🔍 **Possible Conditions** (listed by likelihood):
"""

        for i, pred in enumerate(predictions[:5], 1):
            risk_emoji = "🔴" if pred["probability"] > 0.7 else "🟡" if pred["probability"] > 0.4 else "🟢"
            output += f"{i}. {risk_emoji} **{pred['disease']}** ({pred['risk_level']})\n"
            output += f"   Probability: {pred['probability']:.1%}\n\n"

        output += """
⚠️  **IMPORTANT MEDICAL DISCLAIMER:**
This is NOT a medical diagnosis. This AI assessment is for informational purposes only.
The results are based on general medical knowledge and common symptom patterns.

🏥 **Recommended Next Steps:**
1. Consult a healthcare professional for proper diagnosis
2. Monitor your symptoms closely
3. Seek immediate medical attention if symptoms worsen
4. Contact emergency services for severe symptoms

💊 **When to Seek Emergency Care:**
• Difficulty breathing or chest pain
• High fever (>103°F/39.4°C) that doesn't respond to medication
• Severe headache with confusion or vision changes
• Signs of dehydration
• Symptoms that prevent you from eating/drinking

Take care of yourself! 💙
"""

        print("   Output formatted in patient-friendly language")
        return output

    def assess_symptoms(self, user_input: str) -> str:
        """Main method to run the multi-agent symptom assessment"""
        print("\n🚀 Starting Multi-Agent Symptom Assessment...")
        print("=" * 50)

        # Step 1: Language Detection (Parallel Agent 1)
        detected_language = self._detect_language_parallel(user_input)

        # Step 2: Symptom Analysis (Parallel Agent 2)
        symptoms = self._analyze_symptoms_parallel(user_input)

        # Step 3: Disease Prediction (Parallel Agent 3) - Now using Groq API
        predictions = self._predict_diseases_parallel(symptoms, user_input)

        # Step 4: Output Formatting (Parallel Agent 4)
        final_output = self._format_output_parallel(detected_language, symptoms, predictions)

        print("\n✅ Multi-Agent Assessment Complete!")
        print("=" * 50)

        return final_output