from langdetect import detect, LangDetectException
from typing import Optional

class LanguageDetector:
    def __init__(self):
        # Language code to name mapping
        self.language_names = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'bn': 'Bengali',
            'pa': 'Punjabi',
            'jv': 'Javanese',
            'vi': 'Vietnamese',
            'te': 'Telugu',
            'mr': 'Marathi',
            'ta': 'Tamil',
            'ur': 'Urdu',
            'gu': 'Gujarati',
            'kn': 'Kannada',
            'ml': 'Malayalam',
            'or': 'Oriya',
            'fa': 'Odia',
            'af': 'Afrikaans',
            # Add more as needed
        }

    def detect_language(self, text: str) -> Optional[str]:
        """Detect the language of the given text."""
        try:
            lang_code = detect(text)
            lang_name = self.language_names.get(lang_code, f"Unknown ({lang_code})")
            return lang_name
        except LangDetectException:
            return "Unable to detect language"
        except Exception as e:
            print(f"Error detecting language: {e}")
            return "Error detecting language"

    def is_english(self, text: str) -> bool:
        """Check if the text is in English."""
        try:
            lang_code = detect(text)
            return lang_code == 'en'
        except:
            return False