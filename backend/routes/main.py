"""
Backend API — all 5 endpoints with CORS enabled.
Summary uses Groq API directly (no crewai). PDF/QR use reportlab/qrcode directly (no core imports).
"""

import json, os, sys, smtplib, tempfile, io, base64, hashlib, time
from pathlib import Path
from typing import Optional, List, Dict, Any
from urllib.parse import urlparse
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage

import requests as http_requests
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / "4th_feature" / ".env", override=False)

# ─── Paths ────────────────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).resolve().parent.parent
for p in [str(BACKEND_DIR), str(BACKEND_DIR / "icd"), str(BACKEND_DIR / "4th_feature")]:
    if p not in sys.path:
        sys.path.insert(0, p)

REPORTS_DIR    = BACKEND_DIR / "4th_feature" / "reports"
QRCODES_DIR    = BACKEND_DIR / "4th_feature" / "qrcodes"
STATIC_DIR     = BACKEND_DIR / "4th_feature" / "static"
FONTS_DIR      = BACKEND_DIR / "4th_feature" / "core"
ICD_CODES_PATH = str(BACKEND_DIR / "icd" / "icd_codes.json")
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
QRCODES_DIR.mkdir(parents=True, exist_ok=True)

tokens_db: Dict[str, Any] = {}

# ─── Lazy imports (soap / flag / icd) ────────────────────────────────────────
def _get_soap_funcs():
    from soap.soap_feat import transcribe_audio_with_grok, generate_soap_from_text
    return transcribe_audio_with_grok, generate_soap_from_text

def _get_flag_func():
    from flag.flags_mark import analyze_red_flags
    return analyze_red_flags

def _get_icd_funcs():
    from src.agent import run_soap_to_icd
    from src.disease_info_fetcher import get_disease_info
    return run_soap_to_icd, get_disease_info

def _fallback_risk_assessment(symptoms_text: str, top_n: int) -> Dict[str, Any]:
    symptoms_lower = symptoms_text.lower()
    disease_patterns = {
        "Common Cold": {
            "keywords": ["runny nose", "sore throat", "cough", "sneezing", "congestion", "headache", "fever"],
            "base_risk": 60,
        },
        "Influenza (Flu)": {
            "keywords": ["fever", "chills", "body aches", "fatigue", "cough", "headache", "sore throat"],
            "base_risk": 55,
        },
        "COVID-19": {
            "keywords": ["fever", "cough", "fatigue", "loss of taste", "loss of smell", "shortness of breath", "sore throat"],
            "base_risk": 50,
        },
        "Migraine": {
            "keywords": ["headache", "nausea", "sensitivity to light", "sensitivity to sound", "throbbing pain"],
            "base_risk": 45,
        },
        "Pneumonia": {
            "keywords": ["cough", "fever", "chills", "shortness of breath", "chest pain", "fatigue"],
            "base_risk": 40,
        },
        "Allergies": {
            "keywords": ["sneezing", "itchy eyes", "runny nose", "congestion", "rash", "hives"],
            "base_risk": 35,
        },
        "Gastroenteritis": {
            "keywords": ["nausea", "vomiting", "diarrhea", "stomach pain", "fever", "dehydration"],
            "base_risk": 30,
        },
        "Hypertension": {
            "keywords": ["headache", "dizziness", "chest pain", "shortness of breath", "fatigue"],
            "base_risk": 25,
        },
    }

    risk_scores: Dict[str, int] = {}
    for disease, data in disease_patterns.items():
        score = data["base_risk"]
        for keyword in data["keywords"]:
            if keyword in symptoms_lower:
                score += 10
        risk_scores[disease] = min(100, max(data["base_risk"], score))

    risk_scores = dict(sorted(risk_scores.items(), key=lambda x: x[1], reverse=True))

    def risk_level(score: int) -> str:
        if score >= 70:
            return "High Risk"
        if score >= 40:
            return "Medium Risk"
        return "Low Risk"

    predictions = [
        {"disease": disease, "score": score, "risk_level": risk_level(score)}
        for disease, score in list(risk_scores.items())[:top_n]
    ]

    return {
        "total_diseases_assessed": len(risk_scores),
        "predictions": predictions,
        "risk_scores": risk_scores,
    }

def _patient_risk_level(score: int) -> str:
    if score >= 70:
        return "High Risk"
    if score >= 40:
        return "Medium Risk"
    return "Low Risk"

def _calculate_patient_risk_score(predictions: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not predictions:
        return {"patient_risk_score": 0, "patient_risk_level": "Low Risk"}

    normalized_scores: List[float] = []
    for item in predictions:
        if isinstance(item.get("score"), (int, float)):
            normalized_scores.append(float(item["score"]))
        elif isinstance(item.get("probability"), (int, float)):
            normalized_scores.append(float(item["probability"]) * 100.0)

    if not normalized_scores:
        return {"patient_risk_score": 0, "patient_risk_level": "Low Risk"}

    patient_risk_score = int(round(sum(normalized_scores) / len(normalized_scores)))
    patient_risk_score = max(0, min(100, patient_risk_score))
    return {
        "patient_risk_score": patient_risk_score,
        "patient_risk_level": _patient_risk_level(patient_risk_score),
    }

# ─── Token helpers ────────────────────────────────────────────────────────────
def _make_token(patient_id: str) -> str:
    try:
        from core.security import generate_secure_token
        return generate_secure_token(patient_id)
    except Exception:
        raw = f"{patient_id}-{time.time()}-{os.getenv('SECRET_KEY','secret')}"
        return hashlib.sha256(raw.encode()).hexdigest()[:32]

def _validate_token(token: str) -> bool:
    try:
        from core.security import validate_token
        return validate_token(token)
    except Exception:
        return token in tokens_db

# ─── Alert helper ─────────────────────────────────────────────────────────────
def _alert_str(a) -> str:
    if isinstance(a, dict):
        return (a.get("description") or a.get("condition") or
                a.get("alert") or a.get("message") or str(a))
    return str(a)

# ─── Standalone QR generator ──────────────────────────────────────────────────
def _generate_qr_png(url: str, out_path: str) -> bool:
    try:
        import qrcode
        qrcode.make(url).save(out_path)
        print(f"[QR] ✅ Saved: {out_path}")
        return True
    except Exception as e:
        print(f"[QR] ❌ Failed: {e}")
        return False

def _qr_base64(url: str) -> str:
    try:
        import qrcode
        buf = io.BytesIO()
        qrcode.make(url).save(buf, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return ""

# ─── Standalone PDF generator (matches screenshot design) ────────────────────
def _generate_report_pdf(
    patient_name: str, patient_id: str, doctor_name: str, clinic_name: str,
    visit_date: str, risk_status: str, summary_text: str,
    soap: Dict, icd_mappings: List[Dict], red_flags: Dict,
    qr_path: Optional[str], output_path: str,
) -> bool:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                        Table, TableStyle, Image, PageBreak, KeepTogether)
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
    except ImportError as e:
        print(f"[PDF] reportlab not installed: {e}")
        return False

    # Register NotoSans if available, else fallback to Helvetica
    fn, fb = "Helvetica", "Helvetica-Bold"
    try:
        reg  = str(FONTS_DIR / "NotoSans-Regular.ttf")
        bold = str(FONTS_DIR / "NotoSans-Bold.ttf")
        if os.path.exists(reg):
            pdfmetrics.registerFont(TTFont("NotoSans", reg))
            pdfmetrics.registerFont(TTFont("NotoSans-Bold", bold if os.path.exists(bold) else reg))
            pdfmetrics.registerFontFamily("NotoSans", normal="NotoSans", bold="NotoSans-Bold")
            fn, fb = "NotoSans", "NotoSans-Bold"
    except Exception:
        pass

    BLUE  = colors.HexColor("#3498db")
    DARK  = colors.HexColor("#2c3e50")
    GREY  = colors.HexColor("#7f8c8d")
    LIGHT = colors.HexColor("#f8f9fa")

    def _s(name, **kw):
        font_name = kw.pop("fontName", fn)
        return ParagraphStyle(name, fontName=font_name, **kw)

    def _box(title: str, body: str):
        tp = Paragraph(title, ParagraphStyle("BT", fontName=fb, fontSize=11, textColor=colors.whitesmoke))
        bp = Paragraph(body,  ParagraphStyle("BB", fontName=fn, fontSize=10, leading=15, textColor=DARK))
        t = Table([[tp], [bp]], colWidths=[470])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(0,0), BLUE),
            ("BACKGROUND",    (0,1),(0,1), LIGHT),
            ("BOX",           (0,0),(-1,-1), 1, colors.HexColor("#bdc3c7")),
            ("INNERGRID",     (0,0),(-1,-1), 0.5, colors.HexColor("#bdc3c7")),
            ("LEFTPADDING",   (0,0),(-1,-1), 14), ("RIGHTPADDING", (0,0),(-1,-1), 14),
            ("TOPPADDING",    (0,0),(0,0), 8),     ("BOTTOMPADDING",(0,0),(0,0), 8),
            ("TOPPADDING",    (0,1),(0,1), 12),    ("BOTTOMPADDING",(0,1),(0,1), 12),
        ]))
        return KeepTogether(t)

    doc   = SimpleDocTemplate(output_path, pagesize=A4,
                              rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []

    # Header
    story.append(Paragraph(clinic_name, _s("H", fontSize=18, textColor=DARK, spaceAfter=2)))
    story.append(Paragraph("Official Clinical Report", _s("S", fontSize=10, textColor=GREY, spaceAfter=14)))
    story.append(Table([[""]], colWidths=[470], style=[
        ("LINEBELOW",(0,0),(-1,-1),1,colors.HexColor("#bdc3c7")),
        ("BOTTOMPADDING",(0,0),(-1,-1),5)]))
    story.append(Spacer(1, 15))

    # Patient info grid
    il = _s("IL", fontName=fb, fontSize=11, textColor=DARK)
    iv = _s("IV", fontSize=11, textColor=DARK)
    t_info = Table([
        [Paragraph("Patient Name:", il), Paragraph(patient_name, iv)],
        [Paragraph("Patient ID:",   il), Paragraph(patient_id,   iv)],
        [Paragraph("Visit Date:",   il), Paragraph(visit_date,   iv)],
        [Paragraph("Doctor:",       il), Paragraph(doctor_name,  iv)],
    ], colWidths=[120,350], hAlign="LEFT")
    t_info.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
    story.append(t_info)
    story.append(Spacer(1, 24))

    # Health summary
    s_html = (summary_text or "Summary unavailable.").replace("\n", "<br/>")
    story.append(_box("HEALTH SUMMARY", s_html))
    story.append(Spacer(1, 12))

    # Risk
    rc = "#27ae60" if risk_status == "GREEN" else "#c0392b"
    story.append(Paragraph(f"<b>Status:</b> <font color='{rc}'>{risk_status}</font>",
                           _s("R", fontSize=12, spaceAfter=10)))

    # QR on page 1
    if qr_path and os.path.exists(qr_path):
        story.append(Spacer(1, 20))
        story.append(Paragraph("<b>YOUR DIGITAL REPORT</b>",
                               _s("QT", fontName=fb, alignment=1, fontSize=11)))
        story.append(Spacer(1, 6))
        story.append(Image(qr_path, width=120, height=120))
        story.append(Spacer(1, 4))
        story.append(Paragraph("Scan to verify clinical findings",
                               _s("QI", alignment=1, fontSize=9, textColor=GREY)))

    # Page 2 — Clinical details
    story.append(PageBreak())

    # SOAP / Clinical Notes
    soap_lines = []
    if isinstance(soap, dict):
        if soap.get("chief_complaint"):
            soap_lines.append(f"<b>COMPLAINT:</b><br/>{soap['chief_complaint']}")
        v = soap.get("vitals", {})
        if isinstance(v, dict):
            vs = ", ".join(f"{k.replace('_',' ').title()}: {val}" for k,val in v.items() if val)
            if vs: soap_lines.append(f"<b>VITALS:</b><br/>{vs}")
        if soap.get("objective_findings"):
            soap_lines.append(f"<b>OBJECTIVE:</b><br/>{soap['objective_findings']}")
        if soap.get("plan"):
            soap_lines.append(f"<b>PLAN:</b><br/>{soap['plan']}")
    if soap_lines:
        story.append(_box("CLINICAL NOTES", "<br/><br/>".join(soap_lines)))
        story.append(Spacer(1, 14))

    # Diagnoses & ICD
    diag_lines = []
    for m in icd_mappings:
        d = m.get("disease_details") or {}
        name = d.get("disease_name") or m.get("disease", "Unknown")
        code = d.get("icd_code") or m.get("icd_code", "")
        detail = d.get("what_is_wrong", "")
        line = f"&#x2022; <font color='#c0392b'><b>{name}</b></font> (ICD-10: {code})"
        if detail: line += f"<br/>&nbsp;&nbsp;&nbsp;&nbsp;<i>Detail: {detail}</i>"
        diag_lines.append(line)
    if diag_lines:
        story.append(_box("DIAGNOSES &amp; CODES", "<br/><br/>".join(diag_lines)))
        story.append(Spacer(1, 14))

    # Medications
    med_lines = []
    for m in icd_mappings:
        d = m.get("disease_details") or {}
        for med in d.get("medications", []):
            med_lines.append(f"&#x2022; <b>{med}</b> <font color='#7f8c8d' size='9'>(for {d.get('disease_name','')})</font>")
    if med_lines:
        story.append(_box("MEDICATIONS", "<br/>".join(med_lines)))
        story.append(Spacer(1, 16))

    story.append(Paragraph("<b>FOLLOW UP:</b> As advised by your doctor",
                           _s("FU", fontName=fb, fontSize=12)))
    doc.build(story)
    print(f"[PDF] ✅ Generated: {output_path}")
    return True

# ─── Groq summary (no crewai) ─────────────────────────────────────────────────
def _generate_summary_via_groq(
    patient_name: str, doctor_name: str, clinic_name: str,
    soap: Dict, red_flags: Dict, icd_mappings: List[Dict],
    language: str = "English",
) -> str:
    groq_key = os.getenv("GROQ_API_KEY") or os.getenv("GROK_API_KEY")
    model    = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    if not groq_key:
        return "Summary unavailable — GROQ_API_KEY not set."
    alerts = red_flags.get("alerts", [])
    alerts_text = ", ".join(_alert_str(a) for a in alerts) if alerts else "None"
    icd_text = "\n".join(
        f"- {m.get('disease', m.get('icd_code',''))}: {m.get('icd_code','')}"
        for m in icd_mappings
    ) or "None identified"
    soap_str = json.dumps(soap, indent=2) if isinstance(soap, dict) else str(soap)
    prompt = f"""You are a medical assistant. Generate a clear, empathetic patient-facing health summary in {language}.

Patient: {patient_name}
Doctor: {doctor_name}
Clinic: {clinic_name}

SOAP Notes:
{soap_str}

Red Flags: {alerts_text}
Diagnoses (ICD-10):
{icd_text}

Write a 5-7 sentence summary covering:
1. What's wrong (main complaint and diagnosis)
2. What to take/do (medications and lifestyle)
3. Risk status and urgency
4. Follow-up recommendation
5. Warning signs to watch for

Write ONLY the summary text in {language}, no headings, no JSON. Be warm and clear."""
    try:
        resp = http_requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
            json={"model": model, "messages": [{"role": "user", "content": prompt}],
                  "temperature": 0.4, "max_tokens": 600},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[Groq Summary] Error: {e}")
        return f"Summary generation failed: {e}"

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Cavista Backend API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# ─── Schemas ──────────────────────────────────────────────────────────────────
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
    medical_knowledge: List[Dict[str, Any]] = Field(...)
    clinical_findings: Dict[str, Any] = Field(...)
    risk_status: str = Field(..., pattern="^(GREEN|RED)$")
    follow_up_date: Optional[date] = None
    phone_number: str
    email: EmailStr

class ICDRequest(BaseModel):
    soap_text: str = Field(...)

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)

class SymptomAssessmentRequest(BaseModel):
    symptoms: str = Field(..., min_length=1)
    top_n: int = Field(default=5, ge=1, le=8)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback; traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": f"Internal Server Error: {str(exc)}"})


# ═══════════════════════════════════════════════════════════════════════════════
# 1. HEALTH
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/")
async def health_check():
    return {"status": "ok", "message": "Cavista backend running — CORS + QR + PDF enabled."}


@app.post("/chat")
async def chat(request: ChatRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(400, "Message cannot be empty")

    groq_key = os.getenv("GROQ_API_KEY") or os.getenv("GROK_API_KEY")
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    if not groq_key:
        return {
            "reply": (
                "I received your message, but the AI model is not configured yet. "
                "Please set GROQ_API_KEY in backend/.env to enable assistant responses."
            )
        }

    prompt = (
        "You are a concise healthcare assistant. Provide general informational guidance only. "
        "Do not provide definitive diagnosis. If symptoms seem severe, advise urgent care."
    )

    try:
        resp = http_requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": message},
                ],
                "temperature": 0.3,
                "max_tokens": 300,
            },
            timeout=30,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"].strip()
        return {"reply": content}
    except Exception as e:
        raise HTTPException(500, f"Chat service failed: {e}")


@app.post("/chatbot/assess")
async def chatbot_assess(request: SymptomAssessmentRequest):
    symptoms = request.symptoms.strip()
    if not symptoms:
        raise HTTPException(400, "Symptoms cannot be empty")

    used_fallback = False

    try:
        from chatbot.src.risk_assessor import RiskAssessor

        assessor = RiskAssessor()
        risk_scores = assessor.analyze_symptoms(symptoms)
        ranked = list(risk_scores.items())[: request.top_n]
        predictions = [
            {
                "disease": disease,
                "score": score,
                "risk_level": assessor.get_risk_level(score),
            }
            for disease, score in ranked
        ]
        payload = {
            "total_diseases_assessed": len(risk_scores),
            "predictions": predictions,
            "risk_scores": risk_scores,
        }
    except Exception:
        used_fallback = True
        payload = _fallback_risk_assessment(symptoms, request.top_n)

    patient_risk = _calculate_patient_risk_score(payload.get("predictions", []))

    return {
        "input": symptoms,
        **payload,
        **patient_risk,
        "source": "fallback" if used_fallback else "chatbot_module",
        "disclaimer": "This is an informational AI assessment and not a medical diagnosis.",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 2. AUDIO → SOAP + RED FLAGS
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/upload-audio")
async def upload_audio(
    file: Optional[UploadFile] = File(default=None),
    audio_url: Optional[str] = Form(default=None),
    appointment_id: Optional[str] = Form(default=None),
    frontend_base_url: Optional[str] = Form(default="http://localhost:3000"),
):
    if not file and not audio_url:
        raise HTTPException(400, "Provide 'file' or 'audio_url'")
    suffix = ".wav"
    if file and file.filename: suffix = os.path.splitext(file.filename)[1] or ".wav"
    elif audio_url: suffix = os.path.splitext(urlparse(audio_url).path)[1] or ".wav"
    temp_path = None
    try:
        transcribe_fn, soap_fn = _get_soap_funcs()
        analyze_fn = _get_flag_func()
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            temp_path = tmp.name
            if file: tmp.write(await file.read())
            else:
                r = http_requests.get(audio_url, timeout=60)
                if not r.ok: raise HTTPException(400, f"Cannot download audio: {r.status_code}")
                tmp.write(r.content)
        transcription = transcribe_fn(temp_path)
        if not transcription: raise HTTPException(500, "Transcription failed")
        soap_json = soap_fn(transcription)
        red_flags = analyze_fn(soap_json)
        if appointment_id:
            try:
                http_requests.post(f"{frontend_base_url}/api/save-soap",
                    json={"appointmentId": appointment_id, "transcription": transcription,
                          "soap": soap_json, "red_flags": red_flags}, timeout=30)
            except Exception as e: print(f"[Backend] Convex save skipped: {e}")
        return {"transcription": transcription, "soap": soap_json, "red_flags": red_flags}
    except HTTPException: raise
    except Exception as e: raise HTTPException(500, str(e))
    finally:
        if temp_path and os.path.exists(temp_path): os.remove(temp_path)


# ═══════════════════════════════════════════════════════════════════════════════
# 3. ICD-10 MAPPING
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/icd-mapping")
async def icd_mapping(request: ICDRequest):
    try:
        run_icd, get_info = _get_icd_funcs()
        mappings = run_icd(request.soap_text, icd_path=ICD_CODES_PATH)
        enriched = [{**m, "disease_details": get_info(m.get("disease",""), m.get("icd_code",""))} for m in mappings]
        return {"total": len(mappings), "mappings": mappings, "enriched_mappings": enriched}
    except Exception as e: raise HTTPException(500, str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# 4. SECURE PDF DOWNLOAD
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/report/{token}")
async def view_report(token: str):
    if not _validate_token(token) or token not in tokens_db:
        raise HTTPException(404, "Invalid or expired token")
    pid = tokens_db[token]["patient_id"]
    pdf_path = str(REPORTS_DIR / f"report_{pid}.pdf")
    if not os.path.exists(pdf_path): raise HTTPException(404, "Report not found")
    return FileResponse(pdf_path, media_type="application/pdf", filename=f"report_{pid}.pdf")


# ═══════════════════════════════════════════════════════════════════════════════
# 5. FULL PIPELINE — audio → SOAP → Red Flags → ICD → QR → PDF → Email
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/full-pipeline")
async def full_pipeline(
    file: UploadFile = File(...),
    patient_name:   str = Form(...),
    patient_id:     str = Form(default="P001"),
    doctor_name:    str = Form(default="Dr. Smith"),
    clinic_name:    str = Form(default="Smart EMR Clinic"),
    clinic_phone:   str = Form(default="+910000000000"),
    clinic_address: str = Form(default="India"),
    email:          str = Form(default=""),
    phone_number:   str = Form(default=""),
    preferred_language: str = Form(default="English"),
):
    result: Dict[str, Any] = {"patient_name": patient_name, "steps_completed": [], "errors": []}
    temp_path = None
    risk_status  = "GREEN"
    transcription = ""
    soap_json: Dict = {}
    red_flags: Dict = {}
    icd_enriched: List[Dict] = []

    try:
        suffix = os.path.splitext(file.filename or "audio")[1] or ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            temp_path = tmp.name
            tmp.write(await file.read())

        # Step 1+2 — Transcription + SOAP
        transcribe_fn, soap_fn = _get_soap_funcs()
        transcription = transcribe_fn(temp_path)
        soap_json = soap_fn(transcription)
        result.update({"transcription": transcription, "soap": soap_json})
        result["steps_completed"] += ["transcription", "soap"]

        # Step 3 — Red Flags
        try:
            red_flags = _get_flag_func()(soap_json)
            result["red_flags"] = red_flags
            result["steps_completed"].append("red_flags")
            risk_status = "RED" if red_flags.get("alert_count", 0) > 0 else "GREEN"
            result["risk_status"] = risk_status
        except Exception as e:
            result["errors"].append(f"Red flags: {e}")

        # Step 4 — ICD Mapping
        try:
            run_icd, get_info = _get_icd_funcs()
            for m in run_icd(transcription, icd_path=ICD_CODES_PATH):
                icd_enriched.append({**m, "disease_details": get_info(m.get("disease",""), m.get("icd_code",""))})
            result["icd_mappings"] = icd_enriched
            result["steps_completed"].append("icd_mapping")
        except ModuleNotFoundError as e:
            result["errors"].append(f"ICD skipped (langgraph not installed): {e}")
        except Exception as e:
            result["errors"].append(f"ICD: {e}")

        # Step 5 — Groq Summary
        summary_text = _generate_summary_via_groq(
            patient_name=patient_name, doctor_name=doctor_name, clinic_name=clinic_name,
            soap=soap_json, red_flags=red_flags, icd_mappings=icd_enriched,
            language=preferred_language,
        )
        result["summary_text"] = summary_text
        result["steps_completed"].append("summary")

        pdf_path = None
        qr_path  = None
        report_link = None

        if email:
            # Step 6 — QR Code
            token = _make_token(patient_id)
            report_link = f"http://127.0.0.1:8000/report/{token}"
            tokens_db[token] = {"patient_id": patient_id}

            qr_path = str(QRCODES_DIR / f"qr_{token[:8]}.png")
            if _generate_qr_png(report_link, qr_path):
                result["qr_code_base64"] = _qr_base64(report_link)
                result["report_link"]    = report_link
                result["steps_completed"].append("qr")
            else:
                qr_path = None

            # Step 7 — PDF
            pdf_path = str(REPORTS_DIR / f"report_{patient_id}.pdf")
            pdf_ok = _generate_report_pdf(
                patient_name=patient_name, patient_id=patient_id,
                doctor_name=doctor_name, clinic_name=clinic_name,
                visit_date=str(date.today()), risk_status=risk_status,
                summary_text=summary_text, soap=soap_json,
                icd_mappings=icd_enriched, red_flags=red_flags,
                qr_path=qr_path, output_path=pdf_path,
            )
            if pdf_ok:
                result["steps_completed"].append("pdf")
            else:
                pdf_path = None
                result["errors"].append("PDF generation failed — check reportlab install")

            # Step 8 — Email
            email_status = _send_pipeline_email(
                to_email=email,
                patient_name=patient_name, doctor_name=doctor_name, clinic_name=clinic_name,
                risk_status=risk_status, summary_text=summary_text,
                soap=soap_json, red_flags=red_flags,
                pdf_path=pdf_path, qr_path=qr_path, report_link=report_link,
            )
            result["email_status"] = email_status
            if email_status == "sent":
                result["steps_completed"].append("email")
            else:
                result["errors"].append(f"Email: {email_status}")
        else:
            result["errors"].append("No email — skipping QR, PDF and email steps")

        return result

    except HTTPException: raise
    except Exception as e: raise HTTPException(500, str(e))
    finally:
        if temp_path and os.path.exists(temp_path): os.remove(temp_path)


# ─── Email sender ─────────────────────────────────────────────────────────────
def _send_pipeline_email(
    to_email: str, patient_name: str, doctor_name: str, clinic_name: str,
    risk_status: str, summary_text: str, soap: Dict, red_flags: Dict,
    pdf_path: Optional[str], qr_path: Optional[str], report_link: Optional[str],
) -> str:
    smtp_user   = os.getenv("SMTP_USER")
    smtp_pass   = os.getenv("SMTP_PASS")
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port   = int(os.getenv("SMTP_PORT", "587"))
    email_from  = os.getenv("EMAIL_FROM") or smtp_user
    if not smtp_user or not smtp_pass:
        return "invalid_config — set SMTP_USER + SMTP_PASS in backend/.env"

    risk_icon   = "🔴" if risk_status == "RED" else "🟢"
    alerts      = red_flags.get("alerts", [])
    flags_li    = "".join(f"<li>{_alert_str(a)}</li>" for a in alerts) if alerts else "<li>None detected ✅</li>"
    summary_html = summary_text.replace("\n", "<br>")

    qr_cid     = "qrcode001"
    qr_img_tag = ""
    if qr_path and os.path.exists(qr_path):
        qr_img_tag = f'<img src="cid:{qr_cid}" width="180" height="180" style="border-radius:8px" alt="QR Code">'

    dl_btn = ""
    if report_link:
        dl_btn = f"""
<div style="text-align:center;margin:24px 0">
  <a href="{report_link}"
     style="background:#3498db;color:white;padding:14px 32px;border-radius:8px;
            text-decoration:none;font-size:15px;font-weight:bold;display:inline-block">
    📄 Download Full Report (PDF)
  </a>
  <p style="font-size:11px;color:#999;margin-top:8px">
    <a href="{report_link}" style="color:#999">{report_link}</a>
  </p>
</div>"""

    html = f"""
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:620px;margin:auto;background:#f4f4f4;padding:20px">
<div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)">
  <div style="background:#3498db;color:white;padding:22px 28px">
    <h2 style="margin:0;font-size:22px">{clinic_name}</h2>
    <p style="margin:4px 0 0;opacity:.85;font-size:13px">Post-Consultation Report — {patient_name}</p>
  </div>
  <div style="padding:28px">
    <p style="margin-top:0">Dear <strong>{patient_name}</strong>,<br>
    Your visit summary is ready. Here is a brief overview:</p>

    <div style="border-left:4px solid #3498db;background:#f0f7ff;padding:16px 20px;
                border-radius:0 8px 8px 0;margin:16px 0;white-space:pre-line;
                font-size:14px;line-height:1.8">
{summary_html}
    </div>

    <p><strong>Status:</strong> {risk_icon} <strong>{risk_status}</strong></p>

    <h3 style="color:#e74c3c;margin-bottom:6px">⚠️ Red Flags</h3>
    <ul style="margin-top:0">{flags_li}</ul>

    <div style="text-align:center;margin:28px 0 12px;border-top:1px solid #eee;padding-top:24px">
      <p style="font-weight:bold;font-size:13px;text-transform:uppercase;
                letter-spacing:.5px;color:#555;margin-bottom:12px">
        📱 SCAN OR CLICK TO VIEW FULL REPORT
      </p>
      {qr_img_tag}
    </div>

    {dl_btn}

    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="font-size:11px;color:#999;text-align:center">
      Sent automatically by Smart EMR · {doctor_name} · {clinic_name}
    </p>
  </div>
</div>
</body></html>"""

    msg = MIMEMultipart("related")
    msg["Subject"] = f"[Smart EMR] Consultation Report — {patient_name} {risk_icon}"
    msg["From"]    = email_from
    msg["To"]      = to_email

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(html, "html"))
    msg.attach(alt)

    if qr_path and os.path.exists(qr_path):
        with open(qr_path, "rb") as f:
            img = MIMEImage(f.read())
            img.add_header("Content-ID", f"<{qr_cid}>")
            img.add_header("Content-Disposition", "inline", filename="qr.png")
            msg.attach(img)

    if pdf_path and os.path.exists(pdf_path):
        with open(pdf_path, "rb") as f:
            att = MIMEApplication(f.read(), _subtype="pdf")
            att.add_header("Content-Disposition", "attachment",
                           filename=f"report_{patient_name.replace(' ','_')}.pdf")
            msg.attach(att)

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        print(f"[Pipeline] ✅ Email sent to {to_email}")
        return "sent"
    except Exception as e:
        print(f"[Pipeline] ❌ Email error: {e}")
        return f"failed: {e}"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
