#!/usr/bin/env python3
"""
Test script for the Multi-Agent Symptom Assessment System
"""

from src.multi_agent_assessor import MultiAgentSymptomAssessor

def test_multi_agent_system():
    """Test the multi-agent symptom assessment system"""
    print("Testing Multi-Agent Symptom Assessment System")
    print("=" * 50)

    # Initialize the assessor
    assessor = MultiAgentSymptomAssessor()

    # Test with sample symptoms
    test_input = "I have a fever, cough, and feel very tired. My throat hurts and I have body aches."

    print(f"Test Input: {test_input}")
    print()

    # Run assessment
    result = assessor.assess_symptoms(test_input)

    print("\nFinal Assessment:")
    print(result)

if __name__ == "__main__":
    test_multi_agent_system()