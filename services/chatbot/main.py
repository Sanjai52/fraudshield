"""
services/chatbot/main.py
-------------------------
FraudShield chatbot — in-memory storage (no DB), Supabase JWT auth.
Works locally on port 8001.
Run: uvicorn main:app --reload --port 8001
"""

import os
import uuid
import bleach
from typing import Optional

from fastapi import FastAPI, Request, Body, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

from llm import chat_with_gemini, analyse_message_for_chat, format_analysis_for_chat

load_dotenv()

# ── Config ────────────────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
IS_PRODUCTION   = os.getenv("ENV", "development") == "production"

# ── In-memory chat store ──────────────────────────────────────
# { user_id: { chat_id: [ {role, content} ] } }
IN_MEMORY_CHATS: dict = {}

# ── Rate limiter ──────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/day"])

# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="FraudShield Chatbot API",
    version="1.0.0",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ── Security headers ──────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"]        = "DENY"
    response.headers["X-XSS-Protection"]       = "1; mode=block"
    response.headers["Referrer-Policy"]        = "strict-origin-when-cross-origin"
    return response

# ── Auth helper ───────────────────────────────────────────────
def get_user_id(request: Request) -> Optional[str]:
    """
    Extracts user identifier from Authorization header.
    Uses first 36 chars of token as a stable in-memory key.
    Works with Supabase JWT without needing to verify the secret locally.
    """
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1].strip()
        if token:
            return token[:36]   # stable per-session key
    return None

# ── In-memory helpers ─────────────────────────────────────────
def mem_save(user_id: str, chat_id: str, role: str, content: str) -> None:
    IN_MEMORY_CHATS.setdefault(user_id, {}).setdefault(chat_id, [])
    IN_MEMORY_CHATS[user_id][chat_id].append({"role": role, "content": content})

def mem_history(user_id: str, chat_id: str) -> list[str]:
    messages = IN_MEMORY_CHATS.get(user_id, {}).get(chat_id, [])
    lines = []
    for m in messages:
        prefix = "User" if m["role"] == "user" else "Assistant"
        lines.append(f"{prefix}: {m['content']}")
    return lines

def mem_messages(user_id: str, chat_id: str) -> list[dict]:
    return IN_MEMORY_CHATS.get(user_id, {}).get(chat_id, [])

def mem_list_chats(user_id: str) -> list[dict]:
    user_data = IN_MEMORY_CHATS.get(user_id, {})
    result = []
    for chat_id, msgs in user_data.items():
        if msgs:
            result.append({
                "chat_id": chat_id,
                "preview": msgs[0]["content"][:60] if msgs[0]["role"] == "user" else msgs[1]["content"][:60] if len(msgs) > 1 else "",
            })
    return result

def mem_delete_chat(user_id: str, chat_id: str) -> None:
    IN_MEMORY_CHATS.get(user_id, {}).pop(chat_id, None)

def mem_delete_all(user_id: str) -> None:
    IN_MEMORY_CHATS.pop(user_id, None)

# ── Sanitize ──────────────────────────────────────────────────
def sanitize(text: str, max_len: int = 1500) -> str:
    return bleach.clean(str(text), tags=[], strip=True)[:max_len].strip()

BANK_KEYWORDS = {
    "account", "blocked", "kyc", "otp", "verify", "upi", "debited",
    "credited", "sbi", "hdfc", "icici", "axis", "kotak", "bob",
    "bank", "neft", "imps", "transaction", "fraud", "suspicious",
    "phishing", "scam", "click", "link", "avlbal", "ref",
}

def looks_like_sms(text: str) -> bool:
    lower = text.lower()
    hits  = sum(1 for kw in BANK_KEYWORDS if kw in lower)
    return (
        len(text) < 400
        and hits >= 2
        and not text.strip().endswith("?")
    )

# ── Routes ────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "fraudshield-chatbot", "storage": "in-memory"}


@app.post("/chat/new")
@limiter.limit("30/minute")
def new_chat(request: Request):
    """
    Creates a new chat session.
    Works for both logged-in users and guests.
    """
    user_id = get_user_id(request) or f"guest_{request.client.host}"
    chat_id = str(uuid.uuid4())
    # Pre-initialise the chat slot
    IN_MEMORY_CHATS.setdefault(user_id, {})[chat_id] = []
    return {"chat_id": chat_id}


@app.get("/chats")
@limiter.limit("30/minute")
def list_chats(request: Request):
    user_id = get_user_id(request)
    if not user_id:
        return {"chats": []}
    return {"chats": mem_list_chats(user_id)}


@app.get("/chat/{chat_id}")
@limiter.limit("30/minute")
def load_chat(chat_id: str, request: Request):
    user_id = get_user_id(request)
    if not user_id:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    try:
        uuid.UUID(chat_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chat ID")
    msgs = mem_messages(user_id, chat_id)
    return {"messages": [{"role": m["role"], "content": m["content"]} for m in msgs]}


@app.delete("/chat/{chat_id}")
@limiter.limit("20/minute")
def delete_chat(chat_id: str, request: Request):
    user_id = get_user_id(request)
    if not user_id:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    mem_delete_chat(user_id, chat_id)
    return {"ok": True}


@app.delete("/chats")
@limiter.limit("10/minute")
def delete_all_chats(request: Request):
    user_id = get_user_id(request)
    if not user_id:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    mem_delete_all(user_id)
    return {"ok": True}


@app.post("/chat")
@limiter.limit("20/minute")
async def chat(request: Request, data: dict = Body(...)):
    """
    Main chat endpoint.
    Accepts optional Authorization header — guests allowed.
    Sends history from frontend payload for stateless fallback.
    """
    user_id = get_user_id(request) or f"guest_{request.client.host}"

    chat_id  = data.get("chat_id", "")
    raw_msg  = data.get("message", "")
    frontend_history = data.get("history", [])   # last N messages from frontend

    if not chat_id or not raw_msg:
        raise HTTPException(status_code=400, detail="chat_id and message required")

    try:
        uuid.UUID(chat_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chat ID")

    msg = sanitize(raw_msg)
    if not msg:
        raise HTTPException(status_code=400, detail="Empty message after sanitization")

    # Save user message
    mem_save(user_id, chat_id, "user", msg)

    # Auto-analyse if message looks like a suspicious SMS
    if looks_like_sms(msg):
        analysis = await analyse_message_for_chat(msg)
        if analysis:
            reply = format_analysis_for_chat(analysis)
            mem_save(user_id, chat_id, "assistant", reply)
            return {"reply": reply, "chat_id": chat_id}

    # Build LLM history — prefer in-memory, fall back to frontend payload
    in_mem = mem_history(user_id, chat_id)
    if len(in_mem) > 1:
        llm_history = in_mem
    else:
        # Use history sent from frontend (works for guests too)
        llm_history = []
        for m in (frontend_history or [])[-10:]:
            prefix = "User" if m.get("role") == "user" else "Assistant"
            llm_history.append(f"{prefix}: {m.get('content', '')}")
        if not llm_history:
            llm_history.append(f"User: {msg}")

    reply = chat_with_gemini(llm_history)
    mem_save(user_id, chat_id, "assistant", reply)

    return {"reply": reply, "chat_id": chat_id}
