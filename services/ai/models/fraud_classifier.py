"""
fraud_classifier.py
--------------------
Loads the fine-tuned MuRIL model and exposes predict() and predict_batch().
This is the single source of truth for all model inference in the system.
FastAPI pipelines import from here — nothing else loads the model directly.
"""

import os
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from dotenv import load_dotenv

load_dotenv()

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = os.getenv(
    "MODEL_PATH",
    str(BASE_DIR / "ml" / "registry" / "muril-fraud-v1")
)
print("MODEL PATH:", MODEL_PATH)
VERSION    = "v1"

_tokenizer = None
_model     = None


def _load() -> None:
    """Lazy-load model on first call. Stays in memory after that."""
    global _tokenizer, _model
    if _model is not None:
        return
    print(f"[fraud_classifier] Loading model from {MODEL_PATH} ...")
    _tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    _model     = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
    _model.eval()
    if torch.cuda.is_available():
        _model = _model.cuda()
        print("[fraud_classifier] Running on GPU ✓")
    else:
        print("[fraud_classifier] Running on CPU")
    print("[fraud_classifier] Ready ✓")


def predict(text: str) -> dict:
    """
    Analyse a single message.

    Returns:
        {
            "verdict":           "FRAUD" | "LEGITIMATE",
            "confidence":        float,
            "fraud_probability": float,
            "model_version":     str
        }
    """
    _load()
    inputs = _tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=256,
        padding=True
    )
    if torch.cuda.is_available():
        inputs = {k: v.cuda() for k, v in inputs.items()}

    with torch.no_grad():
        logits = _model(**inputs).logits

    probs = torch.softmax(logits, dim=1)[0]
    label = logits.argmax().item()

    return {
        "verdict":           "FRAUD" if label == 1 else "LEGITIMATE",
        "confidence":        round(float(probs[label]), 4),
        "fraud_probability": round(float(probs[1]), 4),
        "model_version":     VERSION,
    }


def predict_batch(texts: list[str]) -> list[dict]:
    """Analyse multiple messages at once."""
    _load()
    inputs = _tokenizer(
        texts,
        return_tensors="pt",
        truncation=True,
        max_length=256,
        padding=True
    )
    if torch.cuda.is_available():
        inputs = {k: v.cuda() for k, v in inputs.items()}

    with torch.no_grad():
        logits = _model(**inputs).logits

    probs  = torch.softmax(logits, dim=1)
    labels = logits.argmax(dim=1).tolist()

    return [
        {
            "verdict":           "FRAUD" if lbl == 1 else "LEGITIMATE",
            "confidence":        round(float(probs[i][lbl]), 4),
            "fraud_probability": round(float(probs[i][1]), 4),
            "model_version":     VERSION,
        }
        for i, lbl in enumerate(labels)
    ]