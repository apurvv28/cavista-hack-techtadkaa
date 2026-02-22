# Patient Symptom Risk Assessment Chatbot

An AI-powered multi-agent chatbot that orchestrates parallel agents to assess patient symptoms and provide disease risk predictions. The system uses CrewAI-inspired multi-agent orchestration to detect language, analyze symptoms, predict diseases, and format results in patient-friendly language.

## Features

- **🤖 Multi-Agent Orchestration**: Parallel processing with specialized agents
- **🔍 Language Detection Agent**: Automatically detects patient input language
- **🔬 Symptom Analysis Agent**: Extracts and categorizes symptoms from descriptions
- **🩺 Disease Prediction Agent**: Predicts potential diseases with probability scores
- **📝 Output Formatting Agent**: Formats results in easy-to-understand language
- **🎤 Speech Processing**: Text-to-speech and speech-to-text capabilities
- **🌐 Multi-Language Support**: Processes and responds in detected language
- **⚕️ Medical Risk Assessment**: Evidence-based disease probability scoring

## Architecture

### Multi-Agent System Overview

The system employs a **parallel agent orchestration** approach:

1. **Language Detection Agent** 🔍
   - Analyzes input text to detect language
   - Provides ISO language codes and confidence scores
   - Enables multi-language processing

2. **Symptom Analysis Agent** 🔬
   - Extracts symptoms from patient descriptions
   - Categorizes symptoms by type and severity
   - Identifies symptom relationships and patterns

3. **Disease Prediction Agent** 🩺
   - Analyzes symptom patterns against medical knowledge
   - Generates disease predictions with probability scores
   - Considers differential diagnosis

4. **Output Formatting Agent** 📝
   - Formats medical information in patient-friendly language
   - Adapts communication to detected language
   - Provides clear recommendations and disclaimers

### Technical Architecture

- **Orchestration Framework**: Custom multi-agent workflow (designed for CrewAI/LangGraph upgrade)
- **Speech Processing**: PyAudio + SpeechRecognition for voice interaction
- **Language Processing**: LangDetect for automatic language identification
- **Risk Engine**: Pattern-based disease prediction using ICD-10 codes
- **Output System**: Formatted reports with emojis and clear structure

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

**Note**: The system includes placeholders for CrewAI and LangGraph. For full multi-agent capabilities, install additional packages:

```bash
pip install crewai langgraph langchain langchain-openai
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set:

- `OPENAI_API_KEY` – Your OpenAI API key (for advanced agent capabilities)
- `GROQ_API_KEY` – Your Groq API key from [console.groq.com](https://console.groq.com)
- `LLM_MODEL` – Model for analysis; recommended `groq/llama-3.3-70b-versatile`

### 3. Run the Chatbot

```bash
python main.py
```

### 4. Test Multi-Agent System

```bash
python test_multi_agent.py
```

## Usage

### Console Interaction Flow

1. **Patient Name**: The chatbot greets and asks for the patient's name
2. **Symptom Collection**: Asks patient to describe their symptoms
3. **Input Mode Selection**: Offers choice between text input or microphone (speech-to-text)
4. **Language Check**: Detects the language of the input
5. **Risk Assessment**: Analyzes symptoms and calculates risk scores
6. **Output Results**: Displays risk scores for potential diseases

### Example Interaction

```
Chatbot: Hello! I'm here to help assess your symptoms. What's your name?
Patient: John Doe

Chatbot: Thank you, John. Please describe the symptoms you're experiencing.
Patient: I have a headache, fever, and sore throat.

Chatbot: Would you like to enter symptoms via text or use the microphone for speech-to-text?
Patient: text

Chatbot: Processing your symptoms...
[Language detected: English]

Risk Assessment Results:
- Common Cold: High Risk (85%)
- Influenza: Medium Risk (60%)
- Migraine: Low Risk (25%)

Chatbot: Based on your symptoms, you may have a common cold. Please consult a healthcare professional for proper diagnosis.
```

### Python API

```python
from src.chatbot import run_symptom_assessment

# Run the interactive chatbot
risk_scores = run_symptom_assessment()

# Output example
for disease, score in risk_scores.items():
    print(f"{disease}: {score}% risk")
```

## Output

The system returns a dictionary of disease risk scores:

```python
{
    "Common Cold": 85,
    "Influenza": 60,
    "Migraine": 25,
    "Pneumonia": 10,
    ...
}
```

Risk levels are categorized as:
- **High Risk**: 70-100%
- **Medium Risk**: 40-69%
- **Low Risk**: 0-39%

## Project Structure

```
Patient-Symptom-Chatbot/
├── main.py               # CLI entry point for chatbot
├── requirements.txt
├── .env.example
├── src/
│   ├── chatbot.py        # Main chatbot logic and interaction
│   ├── speech_processor.py # Text-to-speech and speech-to-text handling
│   ├── language_detector.py # Language detection and processing
│   ├── risk_assessor.py  # Symptom analysis and risk scoring
│   └── __init__.py
└── README.md
```

## Dependencies

- **NLP Engine**: For symptom analysis and language processing
- **Speech Libraries**: For text-to-speech and speech-to-text functionality
- **Risk Models**: Pre-trained models for disease risk assessment
- **Console Interface**: For interactive user experience

## Models

| Component | Purpose |
|-----------|---------|
| Language Detector | Identifies input language for processing |
| Symptom Analyzer | Extracts and categorizes symptoms from text |
| Risk Calculator | Computes disease probabilities based on symptoms |
| Speech Processor | Handles voice input/output |

## Safety & Privacy

- All patient data is processed locally
- No personal health information is stored permanently
- Risk scores are for informational purposes only
- Always recommend consulting healthcare professionals

## License

See project root for license information.
