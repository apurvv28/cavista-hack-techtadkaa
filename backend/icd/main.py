#!/usr/bin/env python3
"""
ICD Mapping Agent - Extract diseases from SOAP transcripts and map to ICD-10 codes.

Usage:
  # With LiteLLM proxy (start proxy first):
  litellm --config litellm_config.yaml
  python main.py "SOAP transcript here..."

  # Direct Groq (no proxy):
  USE_LITELLM_PROXY=false python main.py "SOAP transcript..."
"""

import os
import sys
import json
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

from src.agent import run_soap_to_icd
from src.disease_info_fetcher import get_disease_info


SAMPLE_SOAP = """
Subjective: 45-year-old male presents with chief complaint of chest pain for 2 days.
Patient reports history of hypertension and type 2 diabetes. Complains of fatigue.

Objective: BP 145/92, HR 78. BMI 32. Labs: fasting glucose 142, HbA1c 7.8%.
EKG normal sinus rhythm. Chest x-ray clear.

Assessment:
1. Chest pain, likely musculoskeletal
2. Hypertension - uncontrolled
3. Type 2 diabetes mellitus - suboptimal control
4. Obesity

Plan: Start metformin adjustment, lisinopril increase. Follow up in 2 weeks.
"""


def save_mappings_to_json(mappings, output_file="icd_mappings_output.json"):
    """Save ICD-10 mappings to JSON file."""
    output_data = {
        "timestamp": datetime.now().isoformat(),
        "total_mappings": len(mappings),
        "mappings": mappings
    }
    
    with open(output_file, "w") as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\n✓ Mappings saved to: {output_file}")
    return output_file


def enrich_mappings_with_disease_info(mappings):
    """
    Enrich mappings with detailed disease information.
    
    Args:
        mappings: List of ICD-10 mappings
        
    Returns:
        List of enriched mappings with disease information
    """
    print("\n" + "="*60)
    print("Fetching detailed disease information...")
    print("="*60)
    
    enriched_mappings = []
    for mapping in mappings:
        disease_name = mapping.get("disease", "")
        icd_code = mapping.get("icd_code", "")
        
        # Get detailed disease information
        disease_info = get_disease_info(disease_name, icd_code)
        
        # Combine mapping with disease info
        enriched = {
            **mapping,
            "disease_details": disease_info
        }
        enriched_mappings.append(enriched)
        
        # Print enriched information
        print(f"\n📋 {disease_name.upper()} ({icd_code})")
        print(f"   What's wrong: {disease_info.get('what_is_wrong', 'N/A')[:100]}...")
        print(f"   Precautions: {', '.join(disease_info.get('precautions', [])[:2])}")
        print(f"   Medications: {', '.join(disease_info.get('medications', [])[:2])}")
        print(f"   Diet specs: {', '.join(disease_info.get('diet_specifications', [])[:2])}")
        print(f"   Followup days: {disease_info.get('recommended_followup_days', {})}")
    
    return enriched_mappings


def save_enriched_mappings_to_json(enriched_mappings, output_file="icd_mappings_detailed.json"):
    """Save enriched ICD-10 mappings with disease info to JSON file."""
    output_data = {
        "timestamp": datetime.now().isoformat(),
        "total_mappings": len(enriched_mappings),
        "description": "Comprehensive ICD-10 mappings with detailed disease information including precautions, medications, diet, and follow-up recommendations",
        "mappings": enriched_mappings
    }
    
    with open(output_file, "w") as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\n✓ Detailed mappings saved to: {output_file}")
    return output_file


def main():
    if len(sys.argv) > 1:
        soap = " ".join(sys.argv[1:])
    else:
        soap = SAMPLE_SOAP
        print("Using sample SOAP transcript. Provide your own as argument.\n")

    print("Processing SOAP transcript...")
    print("-" * 60)

    mappings = run_soap_to_icd(soap)

    print("\nICD-10 Mappings:")
    print("-" * 60)
    for m in mappings:
        code = m.get("icd_code") or "N/A"
        desc = m.get("icd_description", "")
        print(f"  {m.get('disease', '?'):30} -> {code:10}  {desc[:50]}")

    # Save basic mappings
    save_mappings_to_json(mappings)
    
    # Enrich with disease information
    enriched_mappings = enrich_mappings_with_disease_info(mappings)
    
    # Save enriched mappings
    save_enriched_mappings_to_json(enriched_mappings)

    return enriched_mappings


if __name__ == "__main__":
    main()
