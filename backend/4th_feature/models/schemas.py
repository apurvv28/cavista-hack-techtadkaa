from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import date

class Medication(BaseModel):
    name: str
    dose: str
    frequency: str
    duration: str
    instructions: str

class Diagnosis(BaseModel):
    term: str
    icd10: str
    description: Optional[str] = None

class DiseaseDetail(BaseModel):
    disease_name: str
    icd_code: str
    what_is_wrong: str
    precautions: List[str]
    medications: List[str]
    diet_specifications: List[str]
    what_to_do: List[str]
    rehab_options: List[str]
    recommended_followup_days: Dict[str, Any]

class PatientSummaryRequest(BaseModel):
    patient_id: str
    patient_name: str
    preferred_language: str = "English"
    patient_dob: Optional[date] = None
    doctor_name: str
    clinic_name: str
    clinic_phone: str
    clinic_address: str
    visit_date: date = Field(default_factory=date.today)
    
    # New Structured Data for CrewAI
    medical_knowledge: List[Dict[str, Any]] = Field(..., description="ICD-10 mappings and disease details")
    clinical_findings: Dict[str, Any] = Field(..., description="SOAP response and vitals")
    
    # Keep legacy for compatibility or fallback
    risk_status: str = Field(..., pattern="^(GREEN|RED)$")
    follow_up_date: Optional[date] = None
    
    # Contact Info
    phone_number: str = Field(..., description="E.164 format")
    email: EmailStr

class PatientSummaryResponse(BaseModel):
    summary_text: str
    language: str
    language_fallback: bool
    risk_status: str
    report_download_link: str
    qr_code_base64: Optional[str] = None
    sms_status: str
    email_status: str
    errors: List[str] = []
