"""
services/chatbot/main.py
-------------------------
FraudShield chatbot — production-ready FastAPI service.
"""

import os
import uuid
import bleach
from datetime import datetime
from typing import Optional   # ✅ ADDED

from fastapi import FastAPI, Request, Body, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

# DB connection temporarily removed
# In-memory dictionary to store chats
# Format: { user_id: { chat_id: [ {"role": "user"|"assistant", "content": "..."} ] } }
IN_MEMORY_CHATS = {}

def get_chat_history_in_memory(user_id: str, chat_id: str) -> list[str]:
    history = []
    user_chats = IN_MEMORY_CHATS.get(user_id, {})
    messages = user_chats.get(chat_id, [])
    for m in messages:
        if m["role"] == "user":
            history.append(f"User: {m['content']}")
        elif m["role"] == "assistant":
            history.append(f"Assistant: {m['content']}")
    return history

def save_message_in_memory(user_id: str, chat_id: str, role: str, content: str):
    if user_id not in IN_MEMORY_CHATS:
        IN_MEMORY_CHATS[user_id] = {}
    if chat_id not in IN_MEMORY_CHATS[user_id]:
        IN_MEMORY_CHATS[user_id][chat_id] = []
    IN_MEMORY_CHATS[user_id][chat_id].append({"role": role, "content": content})
from llm import chat_with_gemini, analyse_message_for_chat, format_analysis_for_chat

load_dotenv()

# ── Config ────────────────────────────────────────────────────
SESSION_SECRET  = os.getenv("SESSION_SECRET", "")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
IS_PRODUCTION   = os.getenv("ENV", "development") == "production"

if not SESSION_SECRET:
    raise RuntimeError("SESSION_SECRET must be set in .env")

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

# ── Middleware ────────────────────────────────────────────────
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    https_only=IS_PRODUCTION,
    same_site="lax",
    max_age=86400,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
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

# ── OAuth ─────────────────────────────────────────────────────
oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# ── Helpers ───────────────────────────────────────────────────
def get_user(request: Request) -> Optional[dict]:
    # Try getting user from session first (oauth)
    user = request.session.get("user")
    if user: return user
    
    # Try getting user from Authorization header (Supabase)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        # Since we bypass db, we will just use the token as an identifier
        token = auth_header.split(" ")[1]
        return {"id": token[:30], "name": "App User", "email": ""}
        
    return None

def sanitize(text: str, max_len: int = 1500) -> str:
    return bleach.clean(str(text), tags=[], strip=True)[:max_len].strip()

BANK_KEYWORDS = {
    "account", "blocked", "kyc", "otp", "verify", "upi",
    "debited", "credited", "sbi", "hdfc", "icici", "axis",
    "kotak", "bank", "neft", "imps", "transaction", "fraud",
    "suspicious", "phishing", "scam", "click", "link",
}

def looks_like_sms(text: str) -> bool:
    lower = text.lower()
    keyword_count = sum(1 for kw in BANK_KEYWORDS if kw in lower)
    return (
        len(text) < 400
        and keyword_count >= 2
        and not text.strip().endswith("?")
    )

# ── Auth routes ───────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "fraudshield-chatbot"}

@app.get("/login")
async def login(request: Request):
    redirect_uri = request.url_for("auth_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get("/auth/callback")
async def auth_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        info  = token.get("userinfo")
    except Exception as e:
        return HTMLResponse(f"Authentication failed: {e}", status_code=400)

    if not info or not info.get("email"):
        return HTMLResponse("Login failed — no user info", status_code=400)

    request.session["user"] = {
        "id":      info["sub"],
        "name":    info["name"],
        "email":   info["email"],
        "picture": info.get("picture", ""),
    }
    return RedirectResponse(os.getenv("FRONTEND_URL", "http://localhost:3000"))

@app.get("/me")
def me(request: Request):
    user = get_user(request)
    if not user:
        return JSONResponse({"authenticated": False})
    return {"authenticated": True, "user": user}

@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse(os.getenv("FRONTEND_URL", "http://localhost:3000"))

# ── Chat routes ───────────────────────────────────────────────
@app.post("/chat/new")
@limiter.limit("30/minute")
def new_chat(request: Request):
    user = get_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    return {"chat_id": str(uuid.uuid4())}

@app.get("/chats")
@limiter.limit("30/minute")
def list_user_chats(request: Request):
    user = get_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    return {"chats": []} # List chats not needed for now, return empty

@app.get("/chat/{chat_id}")
@limiter.limit("30/minute")
def load_chat(chat_id: str, request: Request):
    user = get_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    try:
        uuid.UUID(chat_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chat ID")

    user_chats = IN_MEMORY_CHATS.get(user["id"], {})
    msgs = user_chats.get(chat_id, [])
    return {"messages": [{"role": m["role"], "content": m["content"]} for m in msgs]}

@app.post("/chat")
@limiter.limit("20/minute")
async def chat(request: Request, data: dict = Body(...)):
    user = get_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    chat_id = data.get("chat_id", "")
    msg     = sanitize(data.get("message", ""))

    if not chat_id or not msg:
        raise HTTPException(status_code=400, detail="chat_id and message required")

    try:
        uuid.UUID(chat_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chat ID")

    save_message_in_memory(user["id"], chat_id, "user", msg)

    if looks_like_sms(msg):
        analysis = await analyse_message_for_chat(msg)
        if analysis:
            reply = format_analysis_for_chat(analysis)
            save_message_in_memory(user["id"], chat_id, "assistant", reply)
            return {"reply": reply, "analysis_id": analysis.get("id")}

    history = get_chat_history_in_memory(user["id"], chat_id)
    reply   = chat_with_gemini(history)

    save_message_in_memory(user["id"], chat_id, "assistant", reply)
    return {"reply": reply}

# ── Guest chat ───────────────────────────────────────────────
@app.post("/chat/guest")
@limiter.limit("5/hour")
async def guest_chat(request: Request, data: dict = Body(...)):
    msg = sanitize(data.get("message", ""))
    if not msg:
        raise HTTPException(status_code=400, detail="message required")

    if looks_like_sms(msg):
        analysis = await analyse_message_for_chat(msg)
        if analysis:
            return {"reply": format_analysis_for_chat(analysis)}

    reply = chat_with_gemini(
        ["User: " + msg],
        system="You are FraudShield AI. Help this user understand if their message is a scam. Be concise.",
    )
    return {"reply": reply}