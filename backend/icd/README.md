# SOAP-to-ICD AI Agent

An AI agent that extracts diseases from SOAP (Subjective, Objective, Assessment, Plan) medical transcripts and maps them to ICD-10 codes using CrewAI, LangGraph, LiteLLM, and LiteLLM Proxy.

## Architecture

- **CrewAI**: Agents for disease extraction and ICD mapping
- **LangGraph**: Workflow orchestration (extract → map → output)
- **LiteLLM**: Model routing and API abstraction
- **LiteLLM Proxy**: Routes requests to Groq API (including `meta-llama/llama-guard-4-12b`)
- **Groq API**: LLM inference via `meta-llama/llama-guard-4-12b` and `groq/llama-3.3-70b-versatile`

> **Note**: `meta-llama/llama-guard-4-12b` is a content moderation/safety model and is not ideal for disease extraction. For best results, use `groq/llama-3.3-70b-versatile` for extraction/mapping by setting `LLM_MODEL=groq/llama-3.3-70b-versatile`.

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set:

- `GROQ_API_KEY` – Your Groq API key from [console.groq.com](https://console.groq.com)
- `LLM_MODEL` – Model for extraction; recommended `groq/llama-3.3-70b-versatile`

### 3. Start LiteLLM Proxy (Optional)

```bash
export GROQ_API_KEY=your_key
litellm --config litellm_config.yaml
```

Proxy runs at `http://localhost:4000`. The config includes:

- `meta-llama/llama-guard-4-12b` – Safety/moderation
- `groq/llama-3.3-70b-versatile` – Disease extraction

### 4. Run Without Proxy

Set `USE_LITELLM_PROXY=false` in `.env` to call Groq directly.

## Usage

### Command Line

```bash
# With sample SOAP transcript (built-in)
python main.py

# With custom SOAP transcript
python main.py "Subjective: 45yo male, chest pain. Assessment: Hypertension, Type 2 diabetes. Plan: Follow up."
```

### Python API

```python
from src.agent import run_soap_to_icd

soap = """
Subjective: 45-year-old male, chest pain for 2 days. History of hypertension.
Objective: BP 145/92. EKG normal.
Assessment: 1. Chest pain, musculoskeletal 2. Hypertension
Plan: Follow up in 2 weeks.
"""

mappings = run_soap_to_icd(soap)

for m in mappings:
    print(f"{m['disease']} -> {m['icd_code']}: {m['icd_description']}")
```

## Output

The agent returns a list of mappings:

```python
[
  {"disease": "Hypertension", "icd_code": "I10", "icd_description": "Essential hypertension"},
  {"disease": "Type 2 diabetes", "icd_code": "E11.9", "icd_description": "Type 2 diabetes mellitus"},
  ...
]
```

## Project Structure

```
ICD-Mapping-agent/
├── icd_codes.json        # ICD-10 codes (71k+ entries)
├── litellm_config.yaml   # LiteLLM proxy config for Groq
├── main.py               # CLI entry point
├── requirements.txt
├── .env.example
└── src/
    ├── agent.py          # LangGraph + CrewAI workflow
    ├── icd_loader.py      # ICD-10 loading and fuzzy search
    └── llm_factory.py    # LLM creation (proxy or direct Groq)
```

## Models

| Model | Purpose |
|-------|---------|
| `meta-llama/llama-guard-4-12b` | Content moderation / safety (configured in proxy) |
| `groq/llama-3.3-70b-versatile` | Disease extraction and ICD mapping |

## License

See project root for license information.
