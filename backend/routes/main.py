import json
import os
import tempfile
from typing import Optional
from urllib.parse import urlparse
import requests
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from soap.soap_feat import transcribe_audio_with_grok, generate_soap_from_text
from flag.flags_mark import analyze_red_flags

app = FastAPI()

@app.get("/")
async def health_check():
    return {"status": "ok", "message": "Backend is running"}


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
