"""
main.py
--------
FraudShield — Python FastAPI AI Engine
Week 3: evidence engine wired — sender ID + URL analysis active

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

app = FastAPI(
    title="FraudShield AI Engine",
    description="Fraud detection API — text, URL, image, voice analysis",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from pipelines.text_pipeline import run as run_text
from pipelines.url_pipeline  import run as run_url
from evidence.sender_ids     import get_bank_sender_ids


# ── Request models ────────────────────────────────────────────

class TextAnalyseRequest(BaseModel):
    message: str
    lang:    str = "en"

class UrlAnalyseRequest(BaseModel):
    url: str


# ── Routes ────────────────────────────────────────────────────

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
        "note":                "Live counters active from Week 5.",
    }


@app.post("/analyse/text")
def analyse_text(body: TextAnalyseRequest):
    """
    Analyse a text message for fraud.
    Returns model verdict + sender ID check + URL checks.
    """
    if not body.message or not body.message.strip():
        raise HTTPException(
            status_code=422,
            detail="message field is required and cannot be empty"
        )
    result = run_text(body.message, body.lang)
    if result["verdict"] == "ERROR":
        raise HTTPException(status_code=422, detail=result["explanation"])
    return result


@app.post("/analyse/url")
def analyse_url(body: UrlAnalyseRequest):
    """
    Analyse a suspicious URL.
    Returns WHOIS + SafeBrowsing + VirusTotal + PhishTank results.
    """
    if not body.url or not body.url.strip():
        raise HTTPException(
            status_code=422,
            detail="url field is required"
        )
    return run_url(body.url)


@app.get("/sender-ids/{bank}")
def sender_ids(bank: str):
    """
    Get verified sender IDs for a bank.
    Example: GET /sender-ids/SBI
    """
    return get_bank_sender_ids(bank)


# ── Stub endpoints — wired in later weeks ─────────────────────

@app.post("/analyse/image")
def analyse_image():
    return {"status": "not_implemented", "week": 7}

@app.post("/analyse/voice")
def analyse_voice():
    return {"status": "not_implemented", "week": 7}

@app.post("/feedback")
def feedback():
    return {"status": "not_implemented", "week": 5}

@app.post("/report")
def report():
    return {"status": "not_implemented", "week": 5}