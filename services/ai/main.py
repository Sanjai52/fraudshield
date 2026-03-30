"""
main.py
--------
FraudShield — FastAPI AI Engine (Production Ready)
"""

# 🔥 MUST BE FIRST — fixes Railway import issues
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import uuid
import bleach

# ✅ FIXED IMPORT (IMPORTANT)
from services.ai.models.fraud_classifier import predict

# Existing pipelines (UNCHANGED)
from pipelines.text_pipeline import run as run_text
from pipelines.url_pipeline import run as run_url
from pipelines.ner_pipeline import extract_entities
from evidence.sender_ids import get_bank_sender_ids

# Chatbot imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "chatbot"))
from chatbot_llm import chat_with_gemini, analyse_message_for_chat, format_analysis_for_chat

load_dotenv()

# ─────────────────────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="FraudShield AI Engine",
    description="Fraud detection API — text, URL, image, voice, chatbot",
    version="1.0.0",
)

# ─────────────────────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────────────────────
_ALLOWED = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001"
).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────
# LIMITS
# ─────────────────────────────────────────────────────────────
MAX_MESSAGE_LENGTH = 5000
MAX_URL_LENGTH = 2048

# ─────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────
class TextAnalyseRequest(BaseModel):
    message: str
    lang: str = "en"

class UrlAnalyseRequest(BaseModel):
    url: str

class ChatBody(BaseModel):
    chat_id: str
    message: str
    history: list = []

# ─────────────────────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "env": os.getenv("ENV", "production"),
    }

# ─────────────────────────────────────────────────────────────
# TEXT ANALYSIS
# ─────────────────────────────────────────────────────────────
@app.post("/analyse/text")
def analyse_text(body: TextAnalyseRequest):
    if not body.message.strip():
        raise HTTPException(status_code=422, detail="message is required")

    if len(body.message) > MAX_MESSAGE_LENGTH:
        raise HTTPException(status_code=422, detail="Message too long")

    result = run_text(body.message, body.lang)

    if result.get("verdict") == "ERROR":
        raise HTTPException(status_code=422, detail=result.get("explanation"))

    return result

# ─────────────────────────────────────────────────────────────
# URL ANALYSIS
# ─────────────────────────────────────────────────────────────
@app.post("/analyse/url")
def analyse_url(body: UrlAnalyseRequest):
    if not body.url.strip():
        raise HTTPException(status_code=422, detail="url is required")

    if len(body.url) > MAX_URL_LENGTH:
        raise HTTPException(status_code=422, detail="URL too long")

    return run_url(body.url)

# ─────────────────────────────────────────────────────────────
# SENDER IDS
# ─────────────────────────────────────────────────────────────
@app.get("/sender-ids/{bank}")
def sender_ids(bank: str):
    return get_bank_sender_ids(bank)

# ─────────────────────────────────────────────────────────────
# ENTITY EXTRACTION
# ─────────────────────────────────────────────────────────────
@app.post("/analyse/entities")
def analyse_entities(body: TextAnalyseRequest):
    return extract_entities(body.message)

# ─────────────────────────────────────────────────────────────
# IMAGE ANALYSIS
# ─────────────────────────────────────────────────────────────
@app.post("/analyse/image")
async def analyse_image(file: UploadFile = File(...)):
    allowed = {"image/png", "image/jpeg", "image/jpg", "image/webp"}

    if file.content_type not in allowed:
        raise HTTPException(status_code=422, detail="Use PNG, JPG, or WEBP")

    image_bytes = await file.read()

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Image too large")

    from pipelines.ocr_pipeline import run as ocr_run
    result = ocr_run(image_bytes, file.filename or "")

    if result.get("verdict") == "ERROR":
        raise HTTPException(status_code=422, detail=result.get("explanation"))

    return result

# ─────────────────────────────────────────────────────────────
# VOICE ANALYSIS
# ─────────────────────────────────────────────────────────────
@app.post("/analyse/voice")
async def analyse_voice(file: UploadFile = File(...)):
    audio_bytes = await file.read()

    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Audio too large")

    from pipelines.voice_pipeline import run as voice_run
    result = voice_run(audio_bytes, file.filename or "")

    if result.get("verdict") == "ERROR":
        raise HTTPException(status_code=422, detail=result.get("explanation"))

    return result

# ─────────────────────────────────────────────────────────────
# CHAT SYSTEM
# ─────────────────────────────────────────────────────────────
_CHATS = {}

def _user_key(request: Request):
    return f"guest_{request.client.host}"

def _sanitize(text: str):
    return bleach.clean(str(text), tags=[], strip=True)[:1500]

@app.post("/chat/new")
async def chat_new(request: Request):
    uid = _user_key(request)
    cid = str(uuid.uuid4())
    _CHATS.setdefault(uid, {})[cid] = []
    return {"chat_id": cid}

@app.post("/chat")
async def chat(body: ChatBody, request: Request):
    uid = _user_key(request)
    msg = _sanitize(body.message)

    if not msg:
        raise HTTPException(status_code=400, detail="Empty message")

    _CHATS.setdefault(uid, {}).setdefault(body.chat_id, [])
    _CHATS[uid][body.chat_id].append({"role": "user", "content": msg})

    # SMS fraud detection shortcut
    analysis = await analyse_message_for_chat(msg)
    if analysis:
        reply = format_analysis_for_chat(analysis)
    else:
        reply = chat_with_gemini([f"User: {msg}"])

    _CHATS[uid][body.chat_id].append({"role": "assistant", "content": reply})

    return {"reply": reply, "chat_id": body.chat_id}