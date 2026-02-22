import pyttsx3
from typing import Optional

# Try to import speech_recognition, but handle the case where PyAudio is not available
try:
    import speech_recognition as sr
    SPEECH_RECOGNITION_AVAILABLE = True
except (ImportError, AttributeError) as e:
    print(f"Warning: Speech recognition not available: {e}")
    sr = None
    SPEECH_RECOGNITION_AVAILABLE = False


class SpeechProcessor:
    def __init__(self):
        # Initialize text-to-speech engine
        try:
            self.tts_engine = pyttsx3.init()
            self.tts_engine.setProperty('rate', 180)    # Speed of speech
            self.tts_engine.setProperty('volume', 0.9)  # Volume (0.0 to 1.0)
        except Exception as e:
            print(f"Warning: TTS engine failed to initialize: {e}")
            self.tts_engine = None

        # Initialize speech recognition
        if SPEECH_RECOGNITION_AVAILABLE:
            self.recognizer = sr.Recognizer()

            # Safely initialize microphone
            try:
                self.microphone = sr.Microphone()
            except (OSError, AttributeError) as e:
                print(f"Warning: Microphone initialization failed: {e}. Speech input will be unavailable.")
                self.microphone = None
        else:
            self.recognizer = None
            self.microphone = None

    def text_to_speech(self, text: str) -> None:
        """Convert text to speech and speak it out."""
        print(f"Speaking: {text}")
        if self.tts_engine:
            try:
                self.tts_engine.say(text)
                self.tts_engine.runAndWait()
            except Exception as e:
                print(f"TTS error: {e}")
        else:
            print("[TTS unavailable]")

    def speech_to_text(self) -> Optional[str]:
        """Listen to microphone and convert speech to text."""
        if not SPEECH_RECOGNITION_AVAILABLE:
            print("Speech recognition is not available (PyAudio not installed).")
            return None

        if self.microphone is None:
            print("Microphone is not available.")
            return None

        try:
            print("Listening... (speak now)")
            with self.microphone as source:
                # Adjust for ambient noise
                self.recognizer.adjust_for_ambient_noise(source, duration=1)
                audio = self.recognizer.listen(
                    source,
                    timeout=5,
                    phrase_time_limit=10
                )

            print("Processing speech...")
            text = self.recognizer.recognize_google(audio)
            print(f"You said: {text}")
            return text.lower()

        except sr.WaitTimeoutError:
            print("No speech detected within timeout.")
            return None
        except sr.UnknownValueError:
            print("Could not understand the speech.")
            return None
        except sr.RequestError as e:
            print(f"Speech recognition service error: {e}")
            print("Tip: Check your internet connection (Google API requires internet).")
            return None
        except Exception as e:
            print(f"Unexpected error in speech recognition: {e}")
            return None

    def get_input_mode(self) -> str:
        """Ask user to choose input mode: text or speech."""
        # If microphone is unavailable, default to text
        if self.microphone is None:
            print("Microphone unavailable. Defaulting to text input mode.")
            return 'text'

        while True:
            self.text_to_speech(
                "Would you like to enter symptoms via text or use the "
                "microphone for speech to text? Say 'text' or 'speech'."
            )
            print("\nWould you like to enter symptoms via text or speech?")
            print("Type 'text' or 'speech': ", end="")

            response = input().strip().lower()

            if response in ['text', 'speech']:
                return response
            else:
                self.text_to_speech("Please say 'text' or 'speech'.")
                print("Invalid input. Please type 'text' or 'speech'.\n")

    def get_symptoms(self) -> Optional[str]:
        """Get symptoms from user via chosen input mode."""
        mode = self.get_input_mode()

        if mode == 'text':
            print("Enter your symptoms: ", end="")
            return input().strip()
        else:
            self.text_to_speech("Please describe your symptoms after the beep.")
            return self.speech_to_text()


# ─────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print("Initializing Speech Processor...")
    processor = SpeechProcessor()

    symptoms = processor.get_symptoms()

    if symptoms:
        print(f"\nSymptoms received: {symptoms}")
        processor.text_to_speech(f"You mentioned: {symptoms}")
    else:
        print("No symptoms were provided.")
        processor.text_to_speech("No symptoms were received. Please try again.")