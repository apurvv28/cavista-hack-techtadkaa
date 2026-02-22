from typing import Dict, Any
from core.agents import generate_agentic_summary

def generate_patient_summary(request_json: Dict[str, Any], language: str) -> Dict[str, Any]:
    """
    Orchestrates the CrewAI multi-agent summary generation.
    """
    medical_knowledge = request_json.get("medical_knowledge", [])
    clinical_findings = request_json.get("clinical_findings", {})
    
    print(f"Starting Agentic Crew for {language} summary...")
    translated_data = generate_agentic_summary(medical_knowledge, clinical_findings, language)
    
    return translated_data
