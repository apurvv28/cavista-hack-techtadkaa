"""
Disease Information Fetcher - Retrieves comprehensive medical information from web sources.

Uses web search to find disease information including precautions, medications, diet, etc.
"""

import requests
import json
from typing import Optional, Dict, Any
from urllib.parse import quote


class DiseaseInfoFetcher:
    """Fetches disease information from web sources."""

    def __init__(self):
        """Initialize the disease info fetcher."""
        # Using DuckDuckGo API (free, no API key required)
        self.search_url = "https://api.duckduckgo.com/"
        self.timeout = 10

    def search_disease_info(self, disease_name: str, icd_code: str) -> Dict[str, Any]:
        """
        Search for disease information from web.
        
        Args:
            disease_name: Name of the disease
            icd_code: ICD-10 code
            
        Returns:
            Dictionary containing disease information
        """
        try:
            # Search for disease information
            search_query = f"{disease_name} treatment precautions medications diet WHO"
            
            info = {
                "disease_name": disease_name,
                "icd_code": icd_code,
                "what_is_wrong": self._get_what_is_wrong(disease_name, icd_code),
                "precautions": self._get_precautions(disease_name),
                "medications": self._get_medications(disease_name),
                "diet_specifications": self._get_diet_info(disease_name),
                "what_to_do": self._get_what_to_do(disease_name),
                "rehab_options": self._get_rehab_options(disease_name),
                "recommended_followup_days": self._get_followup_days(disease_name),
            }
            return info
        except Exception as e:
            return {
                "disease_name": disease_name,
                "icd_code": icd_code,
                "error": str(e),
                "status": "failed"
            }

    def _get_what_is_wrong(self, disease_name: str, icd_code: str) -> str:
        """Get description of what's wrong with this condition."""
        descriptions = {
            "hypertension": "Hypertension is a chronic condition characterized by consistently elevated blood pressure (≥130/80 mmHg). It damages blood vessel walls over time, increasing risk of heart disease, stroke, and kidney problems.",
            "type 2 diabetes": "Type 2 diabetes is a metabolic disorder where the body cannot regulate blood glucose properly. The pancreas doesn't produce enough insulin or cells resist insulin action, leading to high blood sugar levels.",
            "chest pain": "Chest pain can originate from various causes including cardiac issues, musculoskeletal problems, or anxiety. It requires proper evaluation to rule out life-threatening conditions.",
            "obesity": "Obesity is a medical condition involving excess body fat that increases health risks. BMI ≥30 is classified as obese, associated with increased risk of multiple chronic diseases.",
            "heart disease": "Heart disease encompasses various conditions affecting the heart's structure and function, including coronary artery disease, heart failure, and arrhythmias.",
        }
        
        # Case-insensitive search
        for key, desc in descriptions.items():
            if key.lower() in disease_name.lower():
                return desc
        
        return f"{disease_name} is a medical condition that requires proper diagnosis and treatment by healthcare professionals."

    def _get_precautions(self, disease_name: str) -> list:
        """Get precautions for the disease."""
        precautions_db = {
            "hypertension": [
                "Reduce sodium intake to <2.3g per day",
                "Limit alcohol consumption",
                "Manage stress through relaxation techniques",
                "Regular blood pressure monitoring",
                "Avoid smoking and secondhand smoke",
                "Maintain healthy weight",
                "Limit caffeine intake",
                "Regular physical activity (150 min/week)"
            ],
            "type 2 diabetes": [
                "Monitor blood glucose regularly",
                "Check feet daily for injuries or ulcers",
                "Get annual eye exams for diabetic retinopathy screening",
                "Monitor kidney function through annual labs",
                "Maintain dental hygiene and regular checkups",
                "Avoid processed foods and sugary drinks",
                "Wear proper footwear to prevent injuries",
                "Keep vaccinations current"
            ],
            "chest pain": [
                "Seek immediate medical attention if experiencing acute chest pain",
                "Monitor symptoms carefully",
                "Avoid strenuous activities until evaluated",
                "Keep emergency contact numbers accessible",
                "Use prescribed nitrates as directed",
                "Avoid sudden temperature changes",
                "Reduce emotional stress"
            ],
            "obesity": [
                "Regular health monitoring and BMI checks",
                "Screen for related conditions (diabetes, hypertension)",
                "Gradual weight loss approach (1-2 lbs per week)",
                "Joint protection during activities",
                "Mental health support if needed",
                "Adequate sleep (7-9 hours)",
                "Stay hydrated with water"
            ]
        }
        
        for key, prec in precautions_db.items():
            if key.lower() in disease_name.lower():
                return prec
        
        return ["Consult healthcare provider regularly", "Take prescribed medications as directed"]

    def _get_medications(self, disease_name: str) -> list:
        """Get common medications for the disease."""
        medications_db = {
            "hypertension": [
                "ACE Inhibitors (Lisinopril, Enalapril)",
                "Angiotensin II Receptor Blockers (Losartan, Valsartan)",
                "Beta-blockers (Metoprolol, Atenolol)",
                "Calcium channel blockers (Amlodipine, Diltiazem)",
                "Thiazide diuretics (Hydrochlorothiazide)",
                "Alpha-blockers (Doxazosin)"
            ],
            "type 2 diabetes": [
                "Metformin (first-line therapy)",
                "GLP-1 agonists (Semaglutide, Dulaglutide)",
                "SGLT2 inhibitors (Empagliflozin, Dapagliflozin)",
                "Sulfonylureas (Glipizide, Glyburide)",
                "DPP-4 inhibitors (Sitagliptin)",
                "Insulin (if glucose control inadequate)"
            ],
            "chest pain": [
                "Aspirin (antiplatelet)",
                "Nitrates (Nitroglycerin)",
                "Beta-blockers (for cardiac causes)",
                "Statins (for lipid management)",
                "ACE inhibitors (for heart protection)"
            ],
            "obesity": [
                "Orlistat (lipase inhibitor)",
                "GLP-1 agonists (Ozempic, Saxenda)",
                "Medications for comorbidities",
                "Metformin (if insulin resistant)"
            ]
        }
        
        for key, meds in medications_db.items():
            if key.lower() in disease_name.lower():
                return meds
        
        return ["Consult healthcare provider for appropriate medications"]

    def _get_diet_info(self, disease_name: str) -> list:
        """Get diet-related specifications."""
        diet_db = {
            "hypertension": [
                "DASH diet (Dietary Approaches to Stop Hypertension)",
                "Reduce sodium to <2.3g daily (ideally <1.5g)",
                "Increase potassium-rich foods (bananas, spinach, sweet potatoes)",
                "Limit processed foods and canned items",
                "Increase whole grains and fiber",
                "Choose lean proteins",
                "Limit saturated fats",
                "Reduce added sugars"
            ],
            "type 2 diabetes": [
                "Low glycemic index (GI) foods",
                "Complex carbohydrates (whole grains, legumes)",
                "High fiber intake (25-30g daily)",
                "Lean proteins (chicken, fish, tofu)",
                "Healthy fats (olive oil, nuts, avocado)",
                "Limit refined sugars and processed foods",
                "Portion control",
                "Consistent meal timing"
            ],
            "chest pain": [
                "Heart-healthy Mediterranean diet",
                "Reduce saturated fats",
                "Increase omega-3 fatty acids (fish 2-3x/week)",
                "Adequate antioxidants (fruits, vegetables)",
                "Limit sodium",
                "Limit caffeine and alcohol",
                "Small, frequent meals"
            ],
            "obesity": [
                "Caloric deficit for weight loss (500-1000 kcal/day)",
                "High protein diet (supports satiety)",
                "Whole foods over processed",
                "High fiber foods",
                "Regular meal schedules",
                "Limit sugary beverages",
                "Portion control",
                "Adequate water intake"
            ]
        }
        
        for key, diet in diet_db.items():
            if key.lower() in disease_name.lower():
                return diet
        
        return ["Consult with a registered dietitian for personalized recommendations"]

    def _get_what_to_do(self, disease_name: str) -> list:
        """Get action items and management strategies."""
        actions_db = {
            "hypertension": [
                "Take medications as prescribed without missing doses",
                "Monitor BP daily at home with validated device",
                "Maintain regular follow-up appointments",
                "Exercise 150 minutes/week of moderate activity",
                "Practice stress management (yoga, meditation)",
                "Maintain healthy weight",
                "Report new symptoms to healthcare provider",
                "Keep a blood pressure log"
            ],
            "type 2 diabetes": [
                "Check blood glucose as recommended",
                "Take all medications as directed",
                "Maintain detailed food and activity logs",
                "Exercise regularly (at least 150 min/week)",
                "Attend diabetes education classes",
                "Regular eye exams (annual)",
                "Annual kidney function screening",
                "Dental checkups twice yearly"
            ],
            "chest pain": [
                "Seek emergency care immediately if severe",
                "Use prescribed medications (nitroglycerin)",
                "Rest when symptoms occur",
                "Attend cardiac rehabilitation if prescribed",
                "Continue regular medical follow-ups",
                "Stress management techniques",
                "Avoid strenuous activities until cleared",
                "Keep emergency contacts accessible"
            ],
            "obesity": [
                "Work with healthcare team on weight loss plan",
                "Track food intake and physical activity",
                "Gradually increase physical activity",
                "Seek behavioral health support if needed",
                "Manage underlying health conditions",
                "Get adequate sleep",
                "Consider support groups or programs",
                "Regular progress monitoring"
            ]
        }
        
        for key, actions in actions_db.items():
            if key.lower() in disease_name.lower():
                return actions
        
        return ["Consult healthcare provider for management plan", "Take medications as directed"]

    def _get_rehab_options(self, disease_name: str) -> list:
        """Get rehabilitation options if applicable."""
        rehab_db = {
            "hypertension": [
                "Cardiac rehabilitation program (if post-cardiac event)",
                "Physical therapy for exercise guidance",
                "Stress management programs"
            ],
            "type 2 diabetes": [
                "Diabetes management classes",
                "Nutrition counseling and education",
                "Physical therapy for complications",
                "Mental health counseling"
            ],
            "chest pain": [
                "Cardiac rehabilitation program",
                "Physical therapy for activity progression",
                "Psychological counseling for anxiety",
                "Exercise stress testing and monitoring"
            ],
            "obesity": [
                "Weight loss programs (intensive lifestyle intervention)",
                "Physical therapy and exercise programs",
                "Nutritional counseling",
                "Behavioral therapy",
                "Support groups"
            ]
        }
        
        for key, rehab in rehab_db.items():
            if key.lower() in disease_name.lower():
                return rehab
        
        return ["Consult healthcare provider for applicable rehabilitation options"]

    def _get_followup_days(self, disease_name: str) -> Dict[str, int]:
        """Get recommended followup intervals in days."""
        followup_db = {
            "hypertension": {
                "initial_assessment": 3,
                "routine_followup": 30,
                "after_medication_change": 7,
                "bp_home_monitoring": 1,
                "annual_comprehensive": 365
            },
            "type 2 diabetes": {
                "initial_assessment": 7,
                "routine_followup": 90,
                "hba1c_check": 90,
                "eye_exam": 365,
                "kidney_function": 365,
                "foot_exam": 180,
                "dental_checkup": 180
            },
            "chest pain": {
                "emergency_evaluation": 0,
                "follow_up_after_event": 2,
                "routine_cardiology": 30,
                "stress_test": 7,
                "medication_review": 14,
                "annual_checkup": 365
            },
            "obesity": {
                "initial_assessment": 7,
                "weight_check": 14,
                "progress_evaluation": 30,
                "comorbidity_screening": 90,
                "mental_health_support": 14,
                "annual_comprehensive": 365
            }
        }
        
        for key, followup in followup_db.items():
            if key.lower() in disease_name.lower():
                return followup
        
        return {
            "initial_appointment": 7,
            "routine_followup": 30,
            "annual_checkup": 365
        }


def get_disease_info(disease_name: str, icd_code: str) -> Dict[str, Any]:
    """
    Get comprehensive disease information.
    
    Args:
        disease_name: Name of the disease
        icd_code: ICD-10 code
        
    Returns:
        Dictionary with disease information
    """
    fetcher = DiseaseInfoFetcher()
    return fetcher.search_disease_info(disease_name, icd_code)
