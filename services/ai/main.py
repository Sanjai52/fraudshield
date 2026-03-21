"""
main.py
--------
FraudShield — Python FastAPI AI Engine
Week 2: core /analyse/text endpoint + health + stats stubs

Run:
    cd fraudshield/services/ai
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="FraudShield AI Engine",
    description="Fraud detection API — text, URL, image, voice analysis",
    version="1.0.0",
)

# ── CORS — allow Next.js dev server ──────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Import pipelines ─────────────────────────────────────────
from pipelines.text_pipeline import run as analyse_text


# ── Request / Response models ─────────────────────────────────

class TextAnalyseRequest(BaseModel):
    message: str
    lang:    str = "en"

class AnalyseResponse(BaseModel):
    verdict:           str
    display_verdict:   str
    confidence:        float
    fraud_probability: float
    signals:           list[str]
    explanation:       str
    action:            str
    model_version:     str
    language:          str


# ── Routes ────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Service health check — used by gateway and monitoring."""
    return {
        "status":        "ok",
        "model_version": "v1",
        "model":         "google/muril-base-cased",
        "env":           os.getenv("ENV", "development"),
    }


@app.get("/stats/public")
def stats_public():
    """
    Public accuracy stats — shown on /transparency page.
    Week 2: returns static seed values.
    Week 5: replace with live Supabase queries.
    """
    return {
        "total_analyses":      0,
        "fraud_detected":      0,
        "false_positive_rate": 0.0113,
        "model_f1":            0.9733,
        "active_campaigns":    0,
        "note":                "Live counters active from Week 5 after Supabase integration.",
    }


@app.post("/analyse/text", response_model=AnalyseResponse)
def analyse_text_endpoint(body: TextAnalyseRequest):
    """
    Analyse a text message for fraud.

    Input:  { "message": "Your SBI account is blocked...", "lang": "en" }
    Output: full verdict with signals, explanation, and action step.
    """
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=422, detail="message field is required and cannot be empty")

    result = analyse_text(body.message, body.lang)

    if result["verdict"] == "ERROR":
        raise HTTPException(status_code=422, detail=result["explanation"])

    return result


# ── Stub endpoints — wired in Week 3 ──────────────────────────

@app.post("/analyse/url")
def analyse_url():
    return {"status": "not_implemented", "week": 3}

@app.post("/analyse/image")
def analyse_image():
    return {"status": "not_implemented", "week": 3}

@app.post("/analyse/voice")
def analyse_voice():
    return {"status": "not_implemented", "week": 3}

@app.post("/feedback")
def feedback():
    return {"status": "not_implemented", "week": 5}

@app.post("/report")
def report():
    return {"status": "not_implemented", "week": 5}

@app.get("/sender-ids/{bank}")
def sender_ids(bank: str):
    return {"status": "not_implemented", "week": 3}