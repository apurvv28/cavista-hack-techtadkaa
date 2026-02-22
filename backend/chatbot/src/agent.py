"""
SOAP-to-ICD AI Agent using CrewAI, LangGraph, and LiteLLM.

Extracts diseases from SOAP transcripts and maps them to ICD-10 codes.
"""

from typing import TypedDict, Annotated, Sequence
import os
import json

from crewai import Agent, Task, Crew
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

from .icd_loader import ICDLoader
from .llm_factory import get_llm


# --- State for LangGraph ---
class AgentState(TypedDict):
    soap_transcript: str
    extracted_diseases: list[str]
    icd_mappings: list[dict]
    messages: Annotated[Sequence[BaseMessage], add_messages]


# --- Prompts ---
EXTRACT_SYSTEM = """You are a medical coding expert. Your task is to extract ALL disease/condition names mentioned in a SOAP (Subjective, Objective, Assessment, Plan) medical transcript.

SOAP format:
- Subjective: Patient's symptoms, complaints
- Objective: Clinical findings, vitals, lab results
- Assessment: Diagnoses, clinical impression
- Plan: Treatment plan, follow-up

Extract ONLY the disease/condition names (e.g., "Type 2 diabetes", "Hypertension", "Chronic kidney disease"). Do not include symptoms, procedures, or medications unless they indicate a diagnosis.

Return a JSON array of strings. Example: ["Hypertension", "Type 2 diabetes mellitus", "Obesity"]
If no diseases found, return: []"""

MAP_SYSTEM = """You are a medical coding expert mapping disease names to ICD-10 codes.

Given a disease name and a list of candidate ICD-10 codes with descriptions, select the MOST SPECIFIC and ACCURATE ICD-10 code for the disease.

Return ONLY a JSON object: {"code": "X123", "description": "..."} 
Use the exact code from the candidate list. If no good match exists, use the best available or return {"code": null, "description": null}."""


def _parse_json_array(text: str) -> list[str]:
    """Parse LLM response as JSON array of disease names."""
    text = text.strip()
    # Handle markdown code blocks
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return [str(d).strip() for d in parsed if d]
        return []
    except json.JSONDecodeError:
        # Fallback: extract from text
        if "[" in text and "]" in text:
            start = text.index("[") + 1
            end = text.rindex("]")
            inner = text[start:end]
            return [s.strip().strip('"') for s in inner.split(",") if s.strip()]
        return []


def _parse_mapping(text: str) -> dict | None:
    """Parse LLM mapping response."""
    text = text.strip()
    if "```" in text:
        lines = text.split("\n")
        text = "\n".join(l for l in lines if not l.strip().startswith("```"))
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict) and "code" in parsed:
            return parsed
        return None
    except json.JSONDecodeError:
        return None


def create_extraction_crew(llm):
    """Create CrewAI crew for disease extraction."""
    extractor = Agent(
        role="Medical Disease Extractor",
        goal="Extract all disease/condition names from SOAP transcripts accurately",
        backstory="Expert in medical documentation and clinical terminology.",
        llm=llm,
        verbose=True,
    )
    return extractor


def create_mapping_agent(llm):
    """Create CrewAI agent for ICD mapping."""
    return Agent(
        role="ICD-10 Mapper",
        goal="Map disease names to the most accurate ICD-10 codes",
        backstory="Expert in ICD-10 coding and medical terminology.",
        llm=llm,
        verbose=True,
    )


def build_graph(icd_path: str):
    """Build LangGraph workflow for SOAP -> ICD mapping."""
    llm = get_llm()
    icd_loader = ICDLoader(icd_path)
    extractor = create_extraction_crew(llm)
    mapper = create_mapping_agent(llm)

    def extract_node(state: AgentState) -> AgentState:
        soap = state["soap_transcript"]
        task = Task(
            description=f"Extract all disease/condition names from this SOAP transcript:\n\n{soap}",
            expected_output="JSON array of disease names, e.g. [\"Hypertension\", \"Diabetes\"]",
            agent=extractor,
        )
        crew = Crew(agents=[extractor], tasks=[task])
        result = crew.kickoff()
        text = str(result).strip() if result else ""
        diseases = _parse_json_array(text)
        # Deduplicate while preserving order
        seen = set()
        unique = []
        for d in diseases:
            dl = d.lower()
            if dl not in seen:
                seen.add(dl)
                unique.append(d)
        return {**state, "extracted_diseases": unique}

    def map_node(state: AgentState) -> AgentState:
        diseases = state["extracted_diseases"]
        mappings = []

        for disease in diseases:
            candidates = icd_loader.get_codes_for_mapping_prompt(disease, top_k=15)
            task = Task(
                description=f"Map this disease to an ICD-10 code.\n\nDisease: {disease}\n\nCandidate ICD-10 codes:\n{candidates}\n\nSelect the best match.",
                expected_output="JSON object with 'code' and 'description' keys",
                agent=mapper,
            )
            crew = Crew(agents=[mapper], tasks=[task])
            result = crew.kickoff()
            text = str(result).strip() if result else ""
            mapping = _parse_mapping(text)
            if mapping and mapping.get("code"):
                mappings.append({
                    "disease": disease,
                    "icd_code": mapping["code"],
                    "icd_description": mapping.get("description", ""),
                })
            else:
                # Fallback: use top fuzzy match
                fuzzy = icd_loader.search_by_description(disease, limit=1)
                if fuzzy:
                    code, desc, _ = fuzzy[0]
                    mappings.append({"disease": disease, "icd_code": code, "icd_description": desc})
                else:
                    mappings.append({"disease": disease, "icd_code": None, "icd_description": "No match"})

        return {**state, "icd_mappings": mappings}

    workflow = StateGraph(AgentState)

    workflow.add_node("extract", extract_node)
    workflow.add_node("map", map_node)

    workflow.set_entry_point("extract")
    workflow.add_edge("extract", "map")
    workflow.add_edge("map", END)

    return workflow.compile()


def run_soap_to_icd(soap_transcript: str, icd_path: str | None = None) -> list[dict]:
    """
    Extract diseases from SOAP transcript and map to ICD-10 codes.

    Returns list of {disease, icd_code, icd_description}.
    """
    icd_path = icd_path or os.getenv("ICD_CODES_PATH", "icd_codes.json")
    graph = build_graph(icd_path)

    initial: AgentState = {
        "soap_transcript": soap_transcript,
        "extracted_diseases": [],
        "icd_mappings": [],
        "messages": [],
    }

    result = graph.invoke(initial)
    return result.get("icd_mappings", [])
