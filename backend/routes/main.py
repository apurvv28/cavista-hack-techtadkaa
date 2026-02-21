from fastapi import FastAPI, UploadFile
import shutil
import transcribe_audio_with_grok, generate_soap_from_text

app = FastAPI()

@app.post("/upload-audio")
async def upload_audio(file: UploadFile):

    temp_path = "temp_audio.wav"

    # Save audio temporarily
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 1️⃣ Transcribe via Grok Whisper
    transcription = transcribe_audio_with_grok(temp_path)

    # 2️⃣ Convert to SOAP JSON
    soap_json = generate_soap_from_text(transcription)

    return {
        "transcription": transcription,
        "soap": soap_json
    }