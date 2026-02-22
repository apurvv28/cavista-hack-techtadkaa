#!/usr/bin/env python3
"""
Patient Symptom Risk Assessment Chatbot

An interactive chatbot that assesses patient symptoms and provides disease risk scores.

Usage:
  python main.py
"""

import os
import sys
import json
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

from src.chatbot import run_symptom_assessment


def save_assessment_to_json(risk_scores, patient_name, output_file="symptom_assessment_output.json"):
    """Save risk assessment results to JSON file."""
    output_data = {
        "timestamp": datetime.now().isoformat(),
        "patient_name": patient_name,
        "total_diseases_assessed": len(risk_scores),
        "risk_scores": risk_scores
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"\nAssessment saved to {output_file}")


def main():
    """Main entry point for the symptom assessment chatbot."""
    print("=== Patient Symptom Risk Assessment Chatbot ===\n")

    try:
        # Run the chatbot assessment
        risk_scores = run_symptom_assessment()

        if risk_scores:
            # Optionally save results to file
            save_option = input("\nWould you like to save the assessment results to a file? (y/n): ").strip().lower()
            if save_option == 'y':
                patient_name = input("Enter patient name for the file: ").strip() or "Anonymous"
                save_assessment_to_json(risk_scores, patient_name)

        print("\nThank you for using the Symptom Assessment Chatbot!")
        print("Remember: This is not a medical diagnosis. Please consult a healthcare professional.")

    except KeyboardInterrupt:
        print("\n\nChatbot session ended by user.")
    except Exception as e:
        print(f"\nAn error occurred: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
