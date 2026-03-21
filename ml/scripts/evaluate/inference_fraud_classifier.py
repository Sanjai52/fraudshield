"""
inference_fraud_classifier.py
------------------------------
Fraud prediction wrapper for the fine-tuned model.

During model training (this branch):
    Used as a smoke test to verify the model works.

In Phase 1 (services/ai/):
    This file is copied to services/ai/src/core/models/fraud_classifier.py
    FastAPI imports predict() directly.

Usage (smoke test):
    cd fraudshield/
    source ml/venv/Scripts/activate
    python ml/scripts/inference/inference_fraud_classifier.py
"""

import os
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

MODEL_PATH = os.environ.get(
    "FRAUD_MODEL_PATH",
    "ml/registry/muril-fraud-v1",
)

_tokenizer = None
_model     = None
_version   = "v0"


def _load() -> None:
    global _tokenizer, _model
    if _model is None:
        print(f"[fraud_classifier] Loading model from {MODEL_PATH}")
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
        _model     = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
        _model.eval()
        print("[fraud_classifier] Ready ✓")


def predict(text: str) -> dict:
    """
    Analyse a single message for fraud.

    Args:
        text: PII-stripped message text

    Returns:
        {
            "verdict":           "FRAUD" | "LEGITIMATE",
            "confidence":        float,
            "fraud_probability": float,
            "model_version":     str,
        }
    """
    _load()
    inputs = _tokenizer(text, return_tensors="pt",
                        truncation=True, max_length=256, padding=True)
    with torch.no_grad():
        logits = _model(**inputs).logits
    probs = torch.softmax(logits, dim=1)[0]
    label = logits.argmax().item()
    return {
        "verdict":           "FRAUD" if label == 1 else "LEGITIMATE",
        "confidence":        round(float(probs[label]), 4),
        "fraud_probability": round(float(probs[1]),     4),
        "model_version":     _version,
    }


def predict_batch(texts: list[str]) -> list[dict]:
    """Analyse multiple messages at once — used by bulk scan and bot."""
    _load()
    inputs = _tokenizer(texts, return_tensors="pt",
                        truncation=True, max_length=256, padding=True)
    with torch.no_grad():
        logits = _model(**inputs).logits
    probs  = torch.softmax(logits, dim=1)
    labels = logits.argmax(dim=1).tolist()
    return [
        {
            "verdict":           "FRAUD" if lbl == 1 else "LEGITIMATE",
            "confidence":        round(float(probs[i][lbl]), 4),
            "fraud_probability": round(float(probs[i][1]),   4),
            "model_version":     _version,
        }
        for i, lbl in enumerate(labels)
    ]


# ── Smoke test ────────────────────────────────────────────────
if __name__ == "__main__":
    TESTS = [
        ("Your SBI account BLOCKED verify at sbi-kyc.net immediately",         "FRAUD"),
        ("SBI: INR 500 debited from A/c XX4821. Bal: 12450. -SBIBNK",          "LEGITIMATE"),
        ("HDFC: Your account will be closed. Update KYC at hdfc-kyc.co now",   "FRAUD"),
        ("HDFCBK: OTP is 847291. Valid 10 mins. Do not share.",                 "LEGITIMATE"),
        ("Aapka SBI account band ho jayega. Abhi verify karein: sbi-kyc.net",  "FRAUD"),
        ("ICICI: INR 1000 credited on 15-03-26. Bal INR 45230. -ICICIB",       "LEGITIMATE"),
    ]

    print("── Smoke test ──\n")
    passed = 0
    for text, expected in TESTS:
        result = predict(text)
        ok     = result["verdict"] == expected
        passed += ok
        icon   = "✓" if ok else "✗"
        print(f"  {icon} [{result['verdict']:<10} {result['fraud_probability']:.2f}]"
              f"  {text[:65]}...")

    print(f"\n{passed}/{len(TESTS)} passed")
    if passed == len(TESTS):
        print("✓ Model is ready — copy to services/ai/src/core/models/")
    else:
        print("✗ Some predictions wrong — check training data or retrain")