"""
main.py
--------
FraudShield — Python FastAPI AI Engine
Run:
    cd fraudshield/services/ai
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import io

load_dotenv()

app = FastAPI(
    title="FraudShield AI Engine",
    description="Fraud detection API — text, URL, image, voice analysis",
    version="1.0.0",
)

# Gateway only — never the browser directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from pipelines.text_pipeline import run as run_text
from pipelines.url_pipeline  import run as run_url
from pipelines.ner_pipeline  import extract_entities   # ← fixed path
from evidence.sender_ids     import get_bank_sender_ids

MAX_MESSAGE_LENGTH = 5000
MAX_URL_LENGTH     = 2048

class TextAnalyseRequest(BaseModel):
    message: str
    lang:    str = "en"

class UrlAnalyseRequest(BaseModel):
    url: str


@app.get("/health")
def health():
    return {
        "status":        "ok",
        "model_version": "v1",
        "model":         "google/muril-base-cased",
        "env":           os.getenv("ENV", "development"),
        "evidence":      "sender_ids + url_checks active",
    }


@app.get("/stats/public")
def stats_public():
    return {
        "total_analyses":      0,
        "fraud_detected":      0,
        "false_positive_rate": 0.0113,
        "model_f1":            0.9733,
        "active_campaigns":    0,
    }


@app.post("/analyse/text")
def analyse_text(body: TextAnalyseRequest):
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=422, detail="message is required")
    if len(body.message) > MAX_MESSAGE_LENGTH:
        raise HTTPException(status_code=422, detail=f"Message too long (max {MAX_MESSAGE_LENGTH} chars)")
    result = run_text(body.message, body.lang)
    if result["verdict"] == "ERROR":
        raise HTTPException(status_code=422, detail=result["explanation"])
    return result


@app.post("/analyse/url")
def analyse_url(body: UrlAnalyseRequest):
    if not body.url or not body.url.strip():
        raise HTTPException(status_code=422, detail="url is required")
    if len(body.url) > MAX_URL_LENGTH:
        raise HTTPException(status_code=422, detail="URL too long")
    return run_url(body.url)


@app.get("/sender-ids/{bank}")
def sender_ids(bank: str):
    return get_bank_sender_ids(bank)


@app.post("/analyse/image")
async def analyse_image(file: UploadFile = File(...)):
    allowed = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=422, detail="Use PNG, JPG, or WEBP")
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Image too large. Max 10MB.")
    from pipelines.ocr_pipeline import run as ocr_run
    result = ocr_run(image_bytes, file.filename or "")
    if result["verdict"] == "ERROR":
        raise HTTPException(status_code=422, detail=result["explanation"])
    return result


@app.post("/analyse/voice")
async def analyse_voice(file: UploadFile = File(...)):
    allowed = {
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave",
        "audio/ogg", "audio/mp4", "audio/m4a", "audio/x-m4a",
        "audio/webm", "application/octet-stream"
    }
    if file.content_type not in allowed:
        raise HTTPException(status_code=422, detail="Use MP3, WAV, OGG, or M4A")
    audio_bytes = await file.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Audio too large. Max 25MB.")
    from pipelines.voice_pipeline import run as voice_run
    result = voice_run(audio_bytes, file.filename or "")
    if result["verdict"] == "ERROR":
        raise HTTPException(status_code=422, detail=result["explanation"])
    return result


@app.post("/analyse/entities")
def analyse_entities(body: TextAnalyseRequest):
    return extract_entities(body.message)


@app.post("/feedback")
def feedback():
    return {"status": "handled_by_gateway"}

@app.post("/report")
def report():
    return {"status": "not_implemented", "week": 9}