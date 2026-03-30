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
from fastapi import Request
import os
import uuid
import bleach
from fastapi import Header
from jose import jwt, JWTError
import io
from models.fraud_classifier import _load


SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

load_dotenv()

app = FastAPI(
    title="FraudShield AI Engine",
    description="Fraud detection API — text, URL, image, voice analysis",
    version="1.0.0",
)


    
# Gateway only — never the browser directly
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

# ═══════════════════════════════════════════════════════════════
# CHATBOT — merged from services/chatbot/main.py
# All /chat/* routes live here in production (single Render service)
# ═══════════════════════════════════════════════════════════════
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "chatbot"))

from chatbot_llm import chat_with_gemini, analyse_message_for_chat, format_analysis_for_chat

# ── In-memory chat store (resets on restart — acceptable for student project)
_CHATS: dict = {}

def _user_key(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1].strip()
        if token:
            return token[:36]
    return f"guest_{request.client.host}"

def _sanitize_chat(text: str) -> str:
    import bleach
    return bleach.clean(str(text), tags=[], strip=True)[:1500].strip()

_BANK_KWS = {"account","blocked","kyc","otp","verify","upi","debited",
              "credited","sbi","hdfc","icici","axis","kotak","bob",
              "bank","neft","imps","transaction","fraud","avlbal","ref"}

def _is_sms(text: str) -> bool:
    lower = text.lower()
    hits = sum(1 for k in _BANK_KWS if k in lower)
    return len(text) < 400 and hits >= 2 and not text.strip().endswith("?")


@app.get("/chat/health")
def chat_health():
    return {"status": "ok", "service": "chatbot", "storage": "in-memory"}

@app.post("/chat/new")
async def chat_new(request: Request):
    uid = _user_key(request)
    cid = str(uuid.uuid4())
    _CHATS.setdefault(uid, {})[cid] = []
    return {"chat_id": cid}

@app.get("/chats")
async def chat_list(request: Request):
    uid = _user_key(request)
    result = []
    for cid, msgs in _CHATS.get(uid, {}).items():
        if msgs:
            preview = next((m["content"][:60] for m in msgs if m["role"] == "user"), "")
            result.append({"chat_id": cid, "preview": preview})
    return {"chats": result}

@app.get("/chat/{chat_id}")
async def chat_load(chat_id: str, request: Request):
    uid  = _user_key(request)
    msgs = _CHATS.get(uid, {}).get(chat_id, [])
    return {"messages": [{"role": m["role"], "content": m["content"]} for m in msgs]}

@app.delete("/chat/{chat_id}")
async def chat_delete(chat_id: str, request: Request):
    uid = _user_key(request)
    _CHATS.get(uid, {}).pop(chat_id, None)
    return {"ok": True}

@app.delete("/chats")
async def chat_delete_all(request: Request):
    uid = _user_key(request)
    _CHATS.pop(uid, None)
    return {"ok": True}

class ChatBody(BaseModel):
    chat_id: str
    message: str
    history: list = []

@app.post("/chat")
async def chat_send(body: ChatBody, request: Request):
    uid = _user_key(request)
    msg = _sanitize_chat(body.message)
    if not msg:
        raise HTTPException(status_code=400, detail="Empty message")

    _CHATS.setdefault(uid, {}).setdefault(body.chat_id, [])
    _CHATS[uid][body.chat_id].append({"role": "user", "content": msg})

    if _is_sms(msg):
        analysis = await analyse_message_for_chat(msg)
        if analysis:
            reply = format_analysis_for_chat(analysis)
            _CHATS[uid][body.chat_id].append({"role": "assistant", "content": reply})
            return {"reply": reply, "chat_id": body.chat_id}

    stored = _CHATS.get(uid, {}).get(body.chat_id, [])
    if len(stored) > 1:
        llm_history = [
            ("User" if m["role"] == "user" else "Assistant") + ": " + m["content"]
            for m in stored
        ]
    else:
        llm_history = [
            ("User" if m.get("role") == "user" else "Assistant") + ": " + m.get("content", "")
            for m in (body.history or [])[-10:]
        ] or [f"User: {msg}"]

    reply = chat_with_gemini(llm_history)
    _CHATS[uid][body.chat_id].append({"role": "assistant", "content": reply})
    return {"reply": reply, "chat_id": body.chat_id}