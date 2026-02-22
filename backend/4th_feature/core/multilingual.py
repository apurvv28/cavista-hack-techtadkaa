from typing import Dict, List, Optional

SUPPORTED_LANGUAGES = {
    "Marathi": "mr",
    "Hindi": "hi",
    "Tamil": "ta",
    "Telugu": "te",
    "Kannada": "kn",
    "Bengali": "bn"
}

def get_language_config(preferred_language: str):
    """
    Returns the language code and fallback status for a given preferred language.
    """
    if preferred_language == "English":
        return "en", False
    
    # Simple check for supported languages (case-insensitive)
    for lang, code in SUPPORTED_LANGUAGES.items():
        if preferred_language.lower() == lang.lower():
            return code, False
            
    # Fallback to English
    return "en", True

def get_translation_instruction(language_name: str) -> str:
    """
    Generates the prompt instruction for full report translation.
    """
    translate_to = f"Translate the ENTIRE report into {language_name}." if language_name != "English" else "Prepare the report in English."
    medicine_instr = f"Keep medical terms (drug names, diagnosis names) in English but add parenthetical {language_name} explanations." if language_name != "English" else "Use clear professional English medical terminology."
    
    return f"""
- {translate_to}
- {medicine_instr}
- Return ONLY a valid JSON object with these EXACT keys: 
  "summary": (String - A comprehensive, empathetic patient summary. Use these EXACT section titles with emojis:
    🩺 What's Wrong | [Detailed explanation in {language_name}]
    💊 What To Take | [Medicine instructions in {language_name}]
    📋 What To Do | [Lifestyle/Diet advice in {language_name}]
    ⚠️ Risk Status | [Current risk level explanation]
    📅 Follow Up | [When to visit again]
    🚨 Warning Signs | [Symptoms requiring immediate ER visit]
    
    Add a friendly greeting at the start and a professional sign-off at the end.
  ),
  "diagnoses": (Array of Objects - {{"term": "English", "description": "{language_name} translation", "icd10": "Code"}}),
  "medications": (Array of Objects - {{"name": "English", "instructions": "{language_name} translation", "dose": "...", "frequency": "...", "duration": "..."}}),
  "soap": (Object - {{"Subjective": "{language_name}", "Objective": "{language_name}", "Assessment": "{language_name}", "Plan": "{language_name}"}}),
  "risk_status": (String - "GREEN" or "RED")
- Ensure the "summary" uses double newlines between sections.
- NO MARKDOWN (no stars, no hashes). Only plain text and emojis.
"""
