import os
from crewai import Agent, Task, Crew, Process
from langchain_groq import ChatGroq
from typing import Dict, Any, List
import json

def get_llm():
    model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    # Ensure the model name is compatible with CrewAI's internal LiteLLM usage
    if not (model_name.startswith("groq/") or model_name.startswith("openai/")):
        model_name = f"groq/{model_name}"
        
    return ChatGroq(
        api_key=os.getenv("GROQ_API_KEY"),
        model_name=model_name,
        temperature=0.2
    )

class MedicalCrew:
    def __init__(self, medical_knowledge: List[Dict[str, Any]], clinical_findings: Dict[str, Any], language: str):
        self.medical_knowledge = medical_knowledge
        self.clinical_findings = clinical_findings
        self.language = language
        self.llm = get_llm()

    def medical_analyst(self) -> Agent:
        return Agent(
            role="Senior Medical Analyst",
            goal="Accurately cross-reference patient findings with medical knowledge to identify conditions, meds, and risks.",
            backstory="You are an expert physician with 20 years of experience in internal medicine. You excel at taking raw SOAP notes and vitals and matching them against a known knowledge base of ICD-10 codes and disease details.",
            allow_delegation=False,
            verbose=True,
            llm=self.llm
        )

    def patient_communicator(self) -> Agent:
        return Agent(
            role="Patient Communication Specialist",
            goal=f"Translate complex medical analysis into an empathetic, clear 6-section summary in {self.language}.",
            backstory="You are a compassionate patient advocate. Your job is to make sure patients understand their health status without being overwhelmed. You specialize in multilingual communication and health literacy.",
            allow_delegation=False,
            verbose=True,
            llm=self.llm
        )

    def analysis_task(self, analyst: Agent) -> Task:
        return Task(
            description=f"""
            Analyze the clinical findings: {json.dumps(self.clinical_findings)}
            Using the medical knowledge base: {json.dumps(self.medical_knowledge)}
            
            Identify:
            1. Primary and secondary diagnoses matched from the knowledge base.
            2. Recommended medications based on the findings.
            3. Risk status (GREEN or RED) based on vitals and red flags.
            4. Specific lifestyle and dietary advice from the knowledge base for these conditions.
            """,
            expected_output="A structured technical analysis of the patient's condition, including verified medical codes and specific guideline-based recommendations.",
            agent=analyst
        )

    def summary_task(self, communicator: Agent, context: List[Task]) -> Task:
        return Task(
            description=f"""
            Based on the medical analysis, create a patient-friendly summary in {self.language}.
            The summary MUST have these exact sections with emojis:
            🩺 What's Wrong | [Explanation in {self.language}]
            💊 What To Take | [Medication instructions in {self.language}]
            📋 What To Do | [Lifestyle/Diet advice in {self.language}]
            ⚠️ Risk Status | [Current risk level explanation in {self.language}]
            📅 Follow Up | [When to visit again in {self.language}]
            🚨 Warning Signs | [Symptoms requiring immediate ER visit in {self.language}]
            
            Rules:
            - Language: {self.language}
            - Style: Empathetic, simple, supportive.
            - Total length: 150-250 words.
            - Format: Return ONLY a JSON object with keys: "summary", "diagnoses", "medications", "soap", "risk_status".
            """,
            expected_output="A JSON object containing the full multilingual report and structured data.",
            agent=communicator,
            context=context
        )

    def run(self):
        analyst = self.medical_analyst()
        communicator = self.patient_communicator()
        
        task1 = self.analysis_task(analyst)
        task2 = self.summary_task(communicator, [task1])
        
        crew = Crew(
            agents=[analyst, communicator],
            tasks=[task1, task2],
            process=Process.sequential,
            verbose=True
        )
        
        result_raw = str(crew.kickoff())
        
        # 1. Try to find and parse JSON
        try:
            import re
            json_match = re.search(r'(\{.*\})', result_raw, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(1))
                if isinstance(parsed, dict):
                    # AGGRESSIVE CLEANING of 'summary'
                    summary = parsed.get("summary", "")
                    
                    # If it's a string that looks like JSON, parse it
                    if isinstance(summary, str) and (summary.strip().startswith('{') or summary.strip().startswith('[')):
                        try:
                            summary = json.loads(summary)
                        except: pass
                    
                    # Flatten any dict/list into a clean string
                    if isinstance(summary, dict):
                        lines = []
                        for k, v in summary.items():
                            if v:
                                # Clean keys (remove quotes/braces)
                                clean_k = str(k).strip(' "\'{}:')
                                lines.append(f"{clean_k}\n{str(v)}\n")
                        parsed["summary"] = "\n".join(lines)
                    elif isinstance(summary, list):
                        parsed["summary"] = "\n".join([str(x) for x in summary])
                    
                    return parsed
            
            # 2. Fallback: If no JSON or parsing failed, clean the raw string
            return {"summary": result_raw.replace('{', '').replace('}', '').replace('"', '').strip()}
        except Exception as e:
            print(f"Agent Output Parsing Error: {e}")
            return {"summary": result_raw}

def generate_agentic_summary(medical_knowledge: List[Dict[str, Any]], clinical_findings: Dict[str, Any], language: str):
    crew = MedicalCrew(medical_knowledge, clinical_findings, language)
    return crew.run()
