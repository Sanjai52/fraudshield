"""
FraudShield — FastAPI AI Engine
"""

import sys
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)

from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import uuid
import threading

from models.fraud_classifier import predict, _load_model
from pipelines.text_pipeline  import run as run_text
from pipelines.url_pipeline   import run as run_url
from pipelines.ner_pipeline   import extract_entities
from evidence.sender_ids      import get_bank_sender_ids

load_dotenv()

app = FastAPI(title="FraudShield AI Engine", version="1.0.0")

# ── Background model load ─────────────────────────────────────
def _bg_load():
    try:
        _load_model()
    except Exception as e:
        print(f"[startup] model load error: {e}")

threading.Thread(target=_bg_load, daemon=True).start()

_origins = [
    "https://fraudshield-fawn.vercel.app",
    "https://fraudshield-8sqp.vercel.app",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas ───────────────────────────────────────────────────
class TextAnalyseRequest(BaseModel):
    message: str
    lang: str = "en"

class UrlAnalyseRequest(BaseModel):
    url: str

class ChatBody(BaseModel):
    chat_id: str
    message: str
    history: list = []

# ── Health ────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "env": os.getenv("ENV", "production")}

@app.get("/stats/public")
def stats_public():
    return {
        "total_analyses":      0,
        "fraud_detected":      0,
        "false_positive_rate": 0.0063,
        "model_f1":            0.9859,
        "model_version":       "v1",
    }

# ── Text analysis ─────────────────────────────────────────────
@app.post("/analyse/text")
def analyse_text(body: TextAnalyseRequest):
    if not body.message.strip():
        raise HTTPException(422, "message required")
    if len(body.message) > 5000:
        raise HTTPException(422, "message too long — max 5000 chars")
    result = run_text(body.message, body.lang)
    if result.get("verdict") == "ERROR":
        raise HTTPException(422, result.get("explanation"))
    return result

# ── URL analysis ──────────────────────────────────────────────
@app.post("/analyse/url")
def analyse_url(body: UrlAnalyseRequest):
    if not body.url.strip():
        raise HTTPException(422, "url required")
    if len(body.url) > 2048:
        raise HTTPException(422, "url too long")
    return run_url(body.url)

# ── Sender IDs ────────────────────────────────────────────────
@app.get("/sender-ids/{bank}")
def sender_ids(bank: str):
    return get_bank_sender_ids(bank)

# ── Entities ──────────────────────────────────────────────────
@app.post("/analyse/entities")
def analyse_entities(body: TextAnalyseRequest):
    return extract_entities(body.message)

# ── Image ─────────────────────────────────────────────────────
@app.post("/analyse/image")
async def analyse_image(file: UploadFile = File(...)):
    allowed = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(422, "Use PNG, JPG, or WEBP")
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(422, "Image too large — max 10MB")
    from pipelines.ocr_pipeline import run as ocr_run
    result = ocr_run(image_bytes, file.filename or "")
    if result.get("verdict") == "ERROR":
        raise HTTPException(422, result.get("explanation"))
    return result

# ── Voice ─────────────────────────────────────────────────────
@app.post("/analyse/voice")
async def analyse_voice(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(422, "Audio too large — max 25MB")
    from pipelines.voice_pipeline import run as voice_run
    result = voice_run(audio_bytes, file.filename or "")
    if result.get("verdict") == "ERROR":
        raise HTTPException(422, result.get("explanation"))
    return result

# ── Chat (stub — chatbot runs separately) ─────────────────────
_CHATS: dict = {}

@app.post("/chat/new")
async def chat_new(request: Request):
    cid = str(uuid.uuid4())
    return {"chat_id": cid}

@app.post("/chat")
async def chat(body: ChatBody, request: Request):
    return {
        "reply": "Chatbot is not available in this deployment. Please use the web interface.",
        "chat_id": body.chat_id,
    }

# ── Feedback / report stubs ───────────────────────────────────
@app.post("/feedback")
def feedback():
    return {"status": "received"}

@app.post("/report")
def report():
    return {"status": "received"}