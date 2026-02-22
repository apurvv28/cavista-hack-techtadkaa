from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from models.schemas import PatientSummaryRequest, PatientSummaryResponse
from core.summarizer import generate_patient_summary
from core.multilingual import get_language_config
from core.pdf_generator import generate_patient_pdf
from core.security import generate_secure_token, validate_token
from core.qr_generator import save_qr_to_file, generate_qr_base64
from core.notifier import send_sms, send_email
import os
import json
from datetime import date

app = FastAPI(title="Patient Summary Module")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"GLOBAL ERROR: {exc}")
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

# Create directories if they don't exist
os.makedirs("reports", exist_ok=True)
os.makedirs("qrcodes", exist_ok=True)

# Mount static files for the UI
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mock database/cache for tokens (In-memory for demo)
tokens_db = {}

@app.post("/generate-summary", response_model=PatientSummaryResponse)
async def handle_generate_summary(request: PatientSummaryRequest):
    errors = []
    
    # 1. Validation & Language Strategy
    lang_code, is_fallback = get_language_config(request.preferred_language)
    
    # 2. Generate Fully Translated Patient Summary (CrewAI Agents)
    print(f"Generating agentic report for {request.patient_name} in {request.preferred_language}")
    try:
        # Pass the full structured request to the agentic summarizer
        translated_data = generate_patient_summary(request.model_dump(mode='json'), request.preferred_language)
        summary_text = translated_data.get('summary') or 'Summary not available'
    except Exception as e:
        print(f"Agent Generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    # 3. Security Token
    token = generate_secure_token(request.patient_id)
    report_link = f"http://127.0.0.1:8050/report/{token}"
    tokens_db[token] = {
        "patient_id": request.patient_id,
        "data": request.model_dump(mode='json'),
        "summary": summary_text,
        "translated_data": translated_data
    }
    
    # 4. QR Code
    qr_path = f"qrcodes/qr_{token[:8]}.png"
    save_qr_to_file(report_link, qr_path)
    qr_base64 = generate_qr_base64(report_link)
    
    # 5. PDF Generation (Page 1: Multilingual Summary, Page 2: English Technical Report)
    pdf_path = f"reports/report_{request.patient_id}.pdf"
    # Pass translated_data (the agentic output) and the original clinical_findings (English)
    generate_patient_pdf(
        request.model_dump(mode='json'), 
        translated_data, 
        pdf_path, 
        qr_path, 
        lang_code=lang_code
    )
    
    # 6. Notifications
    sms_status = send_sms(
        request.phone_number, 
        request.patient_name.split()[0], 
        request.clinic_name, 
        request.risk_status, 
        summary_text,
        report_link, 
        request.clinic_phone
    )
    
    email_status = send_email(
        request.email,
        request.patient_name,
        request.clinic_name,
        request.risk_status,
        summary_text,
        report_link,
        request.doctor_name,
        request.clinic_phone,
        request.clinic_address,
        pdf_path,
        qr_path
    )
    
    if sms_status != "sent":
        if sms_status == "twilio_unverified_number":
            errors.append(f"SMS failed: Your Twilio trial account requires verifying the number {request.phone_number} at twilio.com/user/account/phone-numbers/verified")
        else:
            errors.append(f"SMS failed: {sms_status}")
            
    if email_status != "sent":
        errors.append(f"Email failed: {email_status}")

    return {
        "summary_text": summary_text,
        "language": request.preferred_language.lower(),
        "language_fallback": is_fallback,
        "risk_status": request.risk_status,
        "report_download_link": report_link,
        "qr_code_base64": qr_base64,
        "sms_status": sms_status,
        "email_status": email_status,
        "errors": errors
    }

@app.get("/report/{token}")
async def view_report(token: str):
    if not validate_token(token) or token not in tokens_db:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    
    patient_id = tokens_db[token]["patient_id"]
    pdf_path = f"reports/report_{patient_id}.pdf"
    
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Report file not found")
        
    return FileResponse(pdf_path, media_type="application/pdf", filename=f"report_{patient_id}.pdf")

@app.get("/")
async def read_index():
    return FileResponse("static/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8050)
