from .speech_processor import SpeechProcessor
from .language_detector import LanguageDetector
from .multi_agent_assessor import MultiAgentSymptomAssessor
from typing import Dict, Optional

class SymptomChatbot:
    def __init__(self):
        try:
            self.speech_processor = SpeechProcessor()
        except Exception as e:
            print(f"Warning: Speech processor initialization failed: {e}")
            self.speech_processor = None

        self.language_detector = LanguageDetector()
        self.multi_agent_assessor = MultiAgentSymptomAssessor()
        self.patient_name = None

    def greet_patient(self) -> str:
        """Greet the patient and ask for their name."""
        greeting = "Hello! I'm here to help assess your symptoms. What's your name?"
        if self.speech_processor:
            self.speech_processor.text_to_speech(greeting)
        print(greeting)
        return input("Your name: ").strip()

    def collect_symptoms(self) -> str:
        """Ask patient to describe their symptoms."""
        question = f"Thank you, {self.patient_name}. Please describe the symptoms you're experiencing."
        if self.speech_processor:
            self.speech_processor.text_to_speech(question)
        print(question)

        # Ask for input mode (only if speech processor is available)
        if self.speech_processor:
            input_mode = self.speech_processor.get_input_mode()
        else:
            input_mode = "text"

        if input_mode == "text":
            print("Please type your symptoms: ", end="")
            symptoms = input().strip()
        else:  # speech
            symptoms = self.speech_processor.speech_to_text()
            if not symptoms:
                # Fallback to text if speech fails
                print("Speech input failed. Please type your symptoms: ", end="")
                symptoms = input().strip()

        return symptoms

    def run_assessment(self) -> Dict[str, int]:
        """Run the complete symptom assessment process."""
        try:
            # Step 1: Get patient name
            self.patient_name = self.greet_patient()
            if not self.patient_name:
                print("No name provided. Exiting.")
                return {}

            # Step 2: Collect symptoms
            symptoms_text = self.collect_symptoms()
            if not symptoms_text:
                print("No symptoms provided. Exiting.")
                return {}

            # Step 3: Use multi-agent system for assessment
            print("\n🔄 Analyzing symptoms with multi-agent system...")
            assessment_result = self.multi_agent_assessor.assess_symptoms(symptoms_text)

            # Step 4: Display results
            print(assessment_result)

            # Return a simple dict for compatibility (though the detailed results are in the formatted output)
            return {"assessment_completed": True, "patient_name": self.patient_name}

        except KeyboardInterrupt:
            print("\nAssessment interrupted by user.")
            return {}
        except Exception as e:
            print(f"An error occurred: {e}")
            return {}

def run_symptom_assessment() -> Dict[str, int]:
    """Main function to run the symptom assessment chatbot."""
    chatbot = SymptomChatbot()
    return chatbot.run_assessment()