"""
services/ai/chatbot/router.py
------------------------------
All /chat/* routes for the FraudShield chatbot.
Mounted into main.py — runs on the same port as the AI engine.

Storage: in-memory (resets on restart).
Auth:    token prefix used as stable user key (no JWT verification needed).
"""

import uuid
import bleach
from typing import Optional

from fastapi import APIRouter, Request, Body, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from chatbot.llm import chat_with_gemini, analyse_message_for_chat, format_analysis_for_chat

router = APIRouter()

# ── In-memory store ───────────────────────────────────────────
# { user_key: { chat_id: [ {"role": str, "content": str} ] } }
_CHATS: dict = {}

# ── Bank keywords for SMS auto-detection ──────────────────────
_BANK_KWS = {
    "account", "blocked", "kyc", "otp", "verify", "upi", "debited",
    "credited", "sbi", "hdfc", "icici", "axis", "kotak", "bob",
    "bank", "neft", "imps", "transaction", "fraud", "suspicious",
    "phishing", "scam", "click", "link", "avlbal", "ref", "suspended",
}


# ── Helpers ───────────────────────────────────────────────────

def _user_key(request: Request) -> str:
    """
    Derives a stable user key from the Authorization header.
    Uses the first 36 chars of the JWT as an in-memory key.
    Falls back to IP for anonymous/guest users.
    """
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1].strip()
        if len(token) >= 36:
            return token[:36]
    client_host = request.client.host if request.client else "unknown"
    return f"guest_{client_host}"


def _sanitize(text: str, max_len: int = 1500) -> str:
    return bleach.clean(str(text), tags=[], strip=True)[:max_len].strip()


def _is_suspicious_sms(text: str) -> bool:
    """
    Detects if the user pasted a suspicious SMS into the chat
    rather than asking a question. If so, auto-analyse it.
    """
    lower = text.lower()
    hits  = sum(1 for kw in _BANK_KWS if kw in lower)
    return (
        len(text) < 500          # SMS-length
        and hits >= 2            # at least 2 banking keywords
        and "?" not in text[:80] # user isn't asking a question
    )


def _mem_save(user_key: str, chat_id: str, role: str, content: str) -> None:
    _CHATS.setdefault(user_key, {}).setdefault(chat_id, [])
    _CHATS[user_key][chat_id].append({"role": role, "content": content})


def _mem_get(user_key: str, chat_id: str) -> list:
    return _CHATS.get(user_key, {}).get(chat_id, [])


def _mem_list(user_key: str) -> list:
    result = []
    for cid, msgs in _CHATS.get(user_key, {}).items():
        if msgs:
            # First user message as preview
            preview = next(
                (m["content"][:80] for m in msgs if m["role"] == "user"), ""
            )
            result.append({"chat_id": cid, "preview": preview})
    return result


# ── Schemas ───────────────────────────────────────────────────

class ChatBody(BaseModel):
    chat_id: str
    message: str
    history: list = []   # last N messages from frontend (for anonymous fallback)


# ── Routes ────────────────────────────────────────────────────

@router.post("/chat/new")
async def chat_new(request: Request):
    """Start a new chat session. Works for guests and logged-in users."""
    user_key = _user_key(request)
    chat_id  = str(uuid.uuid4())
    _CHATS.setdefault(user_key, {})[chat_id] = []
    return {"chat_id": chat_id}


@router.get("/chats")
async def chat_list(request: Request):
    """List all chat sessions for this user."""
    user_key = _user_key(request)
    return {"chats": _mem_list(user_key)}


@router.get("/chat/{chat_id}")
async def chat_load(chat_id: str, request: Request):
    """Load all messages for a specific chat session."""
    try:
        uuid.UUID(chat_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chat ID")
    user_key = _user_key(request)
    msgs     = _mem_get(user_key, chat_id)
    return {"messages": [{"role": m["role"], "content": m["content"]} for m in msgs]}


@router.delete("/chat/{chat_id}")
async def chat_delete(chat_id: str, request: Request):
    """Delete a specific chat session."""
    user_key = _user_key(request)
    _CHATS.get(user_key, {}).pop(chat_id, None)
    return {"ok": True}


@router.delete("/chats")
async def chat_delete_all(request: Request):
    """Delete all chat sessions for this user."""
    user_key = _user_key(request)
    _CHATS.pop(user_key, None)
    return {"ok": True}


@router.post("/chat")
async def chat_send(body: ChatBody, request: Request):
    """
    Main chat endpoint.

    Behaviour:
    1. If message looks like a pasted suspicious SMS → auto-analyse it
       and return structured fraud verdict as the reply.
    2. Otherwise → send to Gemini with full conversation context
       so responses are specific to what the user actually asked.
    """
    user_key = _user_key(request)

    # Validate chat_id
    try:
        uuid.UUID(body.chat_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chat ID")

    msg = _sanitize(body.message)
    if not msg:
        raise HTTPException(status_code=400, detail="Empty message")

    # Save user message to memory
    _mem_save(user_key, body.chat_id, "user", msg)

    # ── Path 1: Suspicious SMS pasted → auto-analyse ──────────
    if _is_suspicious_sms(msg):
        analysis = await analyse_message_for_chat(msg)
        if analysis:
            reply = format_analysis_for_chat(analysis)
            _mem_save(user_key, body.chat_id, "assistant", reply)
            return {"reply": reply, "chat_id": body.chat_id, "auto_analysed": True}

    # ── Path 2: Conversational message → Gemini with context ──
    # Use in-memory history if available (logged-in user with prior turns)
    # Otherwise use the history sent from the frontend (anonymous/new session)
    stored_history = _mem_get(user_key, body.chat_id)

    if len(stored_history) > 1:
        # Use full stored history for context — most accurate
        history_for_llm = stored_history
    else:
        # Fallback: use history sent from frontend
        # This covers: anonymous users, first message, session restart
        history_for_llm = []
        for m in (body.history or [])[-12:]:
            history_for_llm.append({
                "role":    m.get("role", "user"),
                "content": m.get("content", ""),
            })
        # Append current message so LLM sees it as the last turn
        history_for_llm.append({"role": "user", "content": msg})

    reply = chat_with_gemini(
        history    = history_for_llm,
        user_message = msg,
    )

    _mem_save(user_key, body.chat_id, "assistant", reply)
    return {"reply": reply, "chat_id": body.chat_id, "auto_analysed": False}