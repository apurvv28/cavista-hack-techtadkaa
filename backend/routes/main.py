import json
import os
import tempfile
import re
import uuid
import hashlib
from typing import Optional
from urllib.parse import urlparse
import requests
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from soap.soap_feat import transcribe_audio_with_grok, generate_soap_from_text
from flag.flags_mark import analyze_red_flags

app = FastAPI(title="Smart EMR Backend", version="1.0.0")

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────────────────────
# ABHA Sandbox Data – deterministic mock profiles keyed by first 2 digits
# ──────────────────────────────────────────────────────────────────────────────
ABHA_SANDBOX_PROFILES = {
    "14": {"name": "Aarav Sharma",       "gender": "M", "dob": "1990-05-14", "mobile": "XXXXXX7823"},
    "91": {"name": "Priya Nair",         "gender": "F", "dob": "1985-11-22", "mobile": "XXXXXX4512"},
    "43": {"name": "Rohan Mehta",        "gender": "M", "dob": "1995-03-08", "mobile": "XXXXXX6634"},
    "27": {"name": "Kavitha Reddy",      "gender": "F", "dob": "1978-07-30", "mobile": "XXXXXX1190"},
    "56": {"name": "Arjun Patel",        "gender": "M", "dob": "2001-01-15", "mobile": "XXXXXX3356"},
    "78": {"name": "Sunita Agarwal",     "gender": "F", "dob": "1968-09-03", "mobile": "XXXXXX8821"},
    "33": {"name": "Vikram Singh",       "gender": "M", "dob": "1992-06-19", "mobile": "XXXXXX5547"},
    "66": {"name": "Meera Krishnamurti","gender": "F", "dob": "1983-12-25", "mobile": "XXXXXX2293"},
}
DEFAULT_PROFILE = {"name": "Test Patient", "gender": "M", "dob": "1995-01-01", "mobile": "XXXXXX0000"}

# In-memory sandbox records store (keyed by abha_id)
abha_sandbox_records: dict = {}

@app.get("/")
async def health_check():
    return {"status": "ok", "message": "Smart EMR Backend is running", "version": "1.0.0"}


# ──────────────────────────────────────────────────────────────────────────────
# ABHA Sandbox Endpoints (ABDM simulation)
# ──────────────────────────────────────────────────────────────────────────────

class AbhaVerifyRequest(BaseModel):
    abha_id: str

class AbhaLinkRequest(BaseModel):
    abha_id: str
    user_id: str

class AbhaSyncReportRequest(BaseModel):
    abha_id: str
    report_id: str
    appointment_date: str
    soap_summary: str
    doctor_name: Optional[str] = "Dr. (Sandbox)"
    report_type: str = "Consultation"


def validate_abha_format(abha_id: str) -> bool:
    """Validate ABHA ID format: XX-XXXX-XXXX-XXXX (14 digits + 3 hyphens)"""
    pattern = r'^\d{2}-\d{4}-\d{4}-\d{4}$'
    return bool(re.match(pattern, abha_id))


def get_sandbox_profile(abha_id: str) -> dict:
    """Return a deterministic sandbox profile based on the first 2 digits of ABHA ID"""
    prefix = abha_id[:2]
    return ABHA_SANDBOX_PROFILES.get(prefix, DEFAULT_PROFILE)


@app.post("/abha/verify")
async def abha_verify(req: AbhaVerifyRequest):
    """
    ABHA Sandbox: Verify an ABHA ID.
    Simulates the ABDM /v1/registration/aadhaar/verifyABHA endpoint.
    """
    if not validate_abha_format(req.abha_id):
        raise HTTPException(
            status_code=422,
            detail={
                "code": "ABHA_INVALID_FORMAT",
                "message": "Invalid ABHA ID format. Must be XX-XXXX-XXXX-XXXX (14 digits).",
            }
        )

    profile = get_sandbox_profile(req.abha_id)

    return {
        "status": "SUCCESS",
        "sandbox": True,
        "abha_id": req.abha_id,
        "abha_address": f"{req.abha_id.replace('-', '')}@abdm",
        "name": profile["name"],
        "gender": profile["gender"],
        "dob": profile["dob"],
        "mobile": profile["mobile"],
        "verification_token": hashlib.sha256(
            f"sandbox-{req.abha_id}-verify".encode()
        ).hexdigest()[:32],
    }


@app.post("/abha/link")
async def abha_link(req: AbhaLinkRequest):
    """
    ABHA Sandbox: Confirm linking of a patient to their ABHA ID.
    Simulates the ABDM PHR App linking flow.
    """
    if not validate_abha_format(req.abha_id):
        raise HTTPException(
            status_code=422,
            detail={
                "code": "ABHA_INVALID_FORMAT",
                "message": "Invalid ABHA ID format.",
            }
        )

    profile = get_sandbox_profile(req.abha_id)

    # Initialize records bucket for this ABHA ID if not exists
    if req.abha_id not in abha_sandbox_records:
        abha_sandbox_records[req.abha_id] = []

    return {
        "status": "LINKED",
        "sandbox": True,
        "abha_id": req.abha_id,
        "abha_address": f"{req.abha_id.replace('-', '')}@abdm",
        "patient_name": profile["name"],
        "mobile": profile["mobile"],
        "linked_at": __import__('datetime').datetime.utcnow().isoformat() + "Z",
        "access_token": f"sandbox_token_{uuid.uuid4().hex[:16]}",
        "message": "ABHA ID successfully linked to Smart EMR (Sandbox)",
    }


@app.post("/abha/sync-report")
async def abha_sync_report(req: AbhaSyncReportRequest):
    """
    ABHA Sandbox: Sync a consultation report under the patient's ABHA ID.
    Simulates uploading a FHIR DocumentReference to the ABDM Health Locker.
    """
    if not validate_abha_format(req.abha_id):
        raise HTTPException(
            status_code=422,
            detail={
                "code": "ABHA_INVALID_FORMAT",
                "message": "Invalid ABHA ID format.",
            }
        )

    # Create sandbox health record entry
    transaction_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
    record_entry = {
        "transaction_id": transaction_id,
        "report_id": req.report_id,
        "report_type": req.report_type,
        "appointment_date": req.appointment_date,
        "soap_summary": req.soap_summary[:200],  # truncated preview
        "doctor_name": req.doctor_name,
        "synced_at": __import__('datetime').datetime.utcnow().isoformat() + "Z",
        "fhir_resource_id": f"doc-ref-{uuid.uuid4().hex[:8]}",
        "health_locker": "NHA-SANDBOX-LOCKER-01",
    }

    if req.abha_id not in abha_sandbox_records:
        abha_sandbox_records[req.abha_id] = []
    abha_sandbox_records[req.abha_id].append(record_entry)

    return {
        "status": "SYNCED",
        "sandbox": True,
        "abha_id": req.abha_id,
        "transaction_id": transaction_id,
        "fhir_resource_id": record_entry["fhir_resource_id"],
        "health_locker": record_entry["health_locker"],
        "message": f"Report synced to ABHA PHR successfully (Sandbox). Transaction: {transaction_id}",
    }


@app.get("/abha/records/{abha_id}")
async def abha_get_records(abha_id: str):
    """
    ABHA Sandbox: Fetch all synced health records for a given ABHA ID.
    Simulates fetching from the ABDM Health Locker.
    """
    if not validate_abha_format(abha_id):
        raise HTTPException(
            status_code=422,
            detail={
                "code": "ABHA_INVALID_FORMAT",
                "message": "Invalid ABHA ID format.",
            }
        )

    profile = get_sandbox_profile(abha_id)
    records = abha_sandbox_records.get(abha_id, [])

    return {
        "status": "SUCCESS",
        "sandbox": True,
        "abha_id": abha_id,
        "patient_name": profile["name"],
        "total_records": len(records),
        "records": records,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Audio / SOAP Endpoints
# ──────────────────────────────────────────────────────────────────────────────


@app.post("/upload-audio")
async def upload_audio(
    file: Optional[UploadFile] = File(default=None),
    audio_url: Optional[str] = Form(default=None),
    appointment_id: Optional[str] = Form(default=None),
    frontend_base_url: Optional[str] = Form(default="http://localhost:3000"),
):
    if not file and not audio_url:
        raise HTTPException(
            status_code=400,
            detail="Provide either multipart 'file' or form field 'audio_url'",
        )

    if file and file.filename:
        suffix = os.path.splitext(file.filename)[1] or ".wav"
    elif audio_url:
        parsed = urlparse(audio_url)
        suffix = os.path.splitext(parsed.path)[1] or ".wav"
    else:
        suffix = ".wav"

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = temp_file.name
            if file:
                temp_file.write(await file.read())
            else:
                response = requests.get(audio_url, timeout=60)
                if not response.ok:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Unable to download audio_url: {response.status_code}",
                    )
                temp_file.write(response.content)

        transcription = transcribe_audio_with_grok(temp_path)
        if not transcription:
            raise HTTPException(status_code=500, detail="Transcription failed")

        soap_json = generate_soap_from_text(transcription)
        red_flag_result = analyze_red_flags(soap_json)

        print("\n===== PIPELINE RESULT =====")
        print(json.dumps(red_flag_result, indent=2))
        print("===========================\n")

        # Save to Convex if appointment_id provided
        if appointment_id:
            try:
                save_result = requests.post(
                    f"{frontend_base_url}/api/save-soap",
                    json={
                        "appointmentId": appointment_id,
                        "transcription": transcription,
                        "soap": soap_json,
                        "red_flags": red_flag_result,
                    },
                    timeout=30,
                )
                if save_result.ok:
                    print(f"[Backend] SOAP note saved to Convex: {save_result.json()}")
                else:
                    print(f"[Backend] Warning: Failed to save SOAP to Convex: {save_result.text}")
            except Exception as e:
                print(f"[Backend] Warning: Could not save SOAP to Convex: {e}")

        return {
            "transcription": transcription,
            "soap": soap_json,
            "red_flags": red_flag_result,
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    # Test the api with the sample audio file
    import requests
    from pathlib import Path

    url = "http://localhost:8000/upload-audio"
    sample_audio_path = Path(__file__).resolve().parents[1] / "soap" / "Rohan_1771691946623.webm"

    if not sample_audio_path.exists():
        raise FileNotFoundError(f"Sample audio not found at {sample_audio_path}")

    with open(sample_audio_path, "rb") as audio_file:
        response = requests.post(url, files={"file": audio_file}, timeout=120)

    print("API Response:", response.json())
