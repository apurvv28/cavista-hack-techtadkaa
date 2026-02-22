import re
from typing import Dict, List
from langdetect import detect

class RiskAssessor:
    def __init__(self):
        # Define disease patterns and risk keywords
        self.disease_patterns = {
            "Common Cold": {
                "keywords": ["runny nose", "sore throat", "cough", "sneezing", "congestion", "headache", "fever"],
                "base_risk": 60
            },
            "Influenza (Flu)": {
                "keywords": ["fever", "chills", "body aches", "fatigue", "cough", "headache", "sore throat"],
                "base_risk": 55
            },
            "COVID-19": {
                "keywords": ["fever", "cough", "fatigue", "loss of taste", "loss of smell", "shortness of breath", "sore throat"],
                "base_risk": 50
            },
            "Migraine": {
                "keywords": ["headache", "nausea", "sensitivity to light", "sensitivity to sound", "throbbing pain"],
                "base_risk": 45
            },
            "Pneumonia": {
                "keywords": ["cough", "fever", "chills", "shortness of breath", "chest pain", "fatigue"],
                "base_risk": 40
            },
            "Allergies": {
                "keywords": ["sneezing", "itchy eyes", "runny nose", "congestion", "rash", "hives"],
                "base_risk": 35
            },
            "Gastroenteritis": {
                "keywords": ["nausea", "vomiting", "diarrhea", "stomach pain", "fever", "dehydration"],
                "base_risk": 30
            },
            "Hypertension": {
                "keywords": ["headache", "dizziness", "chest pain", "shortness of breath", "fatigue"],
                "base_risk": 25
            }
        }

    def analyze_symptoms(self, symptoms_text: str) -> Dict[str, int]:
        """Analyze symptoms text and return risk scores for diseases."""
        # Clean and normalize text
        symptoms_lower = symptoms_text.lower()

        risk_scores = {}

        for disease, data in self.disease_patterns.items():
            score = 0
            keywords_found = 0

            for keyword in data["keywords"]:
                if keyword.lower() in symptoms_lower:
                    keywords_found += 1
                    score += 10  # Points per keyword match

            # Base risk plus keyword matches
            total_score = data["base_risk"] + score

            # Cap at 100 and ensure minimum of base_risk
            risk_scores[disease] = min(100, max(data["base_risk"], total_score))

        # Sort by risk score descending
        sorted_risks = dict(sorted(risk_scores.items(), key=lambda x: x[1], reverse=True))

        return sorted_risks

    def get_risk_level(self, score: int) -> str:
        """Get risk level description based on score."""
        if score >= 70:
            return "High Risk"
        elif score >= 40:
            return "Medium Risk"
        else:
            return "Low Risk"

    def format_risk_report(self, risk_scores: Dict[str, int]) -> str:
        """Format risk scores into a readable report."""
        report_lines = ["Risk Assessment Results:"]

        for disease, score in risk_scores.items():
            level = self.get_risk_level(score)
            report_lines.append(f"- {disease}: {level} ({score}%)")

        return "\n".join(report_lines)