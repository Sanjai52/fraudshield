"""
fraud_classifier.py
--------------------
Calls the HuggingFace Inference Router API for the MuRIL fraud classifier.

IMPORTANT: HuggingFace retired api-inference.huggingface.co (HTTP 410).
The new endpoint is router.huggingface.co/hf-inference/models/{MODEL_ID}

LABEL_0 = LEGITIMATE
LABEL_1 = FRAUD

Run locally:
    MODEL_PATH=../../ml/registry/muril-fraud-v1 python -c "from models.fraud_classifier import predict; print(predict('test'))"
"""

import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN", "")
MODEL_ID  = "Sanjai1968/muril-fraud-v1"

# ── NEW endpoint — router.huggingface.co (replaces api-inference which returned 410) ──
API_URL  = f"https://router.huggingface.co/hf-inference/models/{MODEL_ID}"
VERSION  = "v1"


def predict(text: str) -> dict:
    """
    Call the HuggingFace Inference Router and parse the response.

    Response shape from HF binary classifier:
        [[{"label": "LABEL_0", "score": 0.91}, {"label": "LABEL_1", "score": 0.09}]]

    Handles:
      - Shape A: [[{label, score}, {label, score}]]  — all labels returned
      - Shape B: [{label, score}]                    — top-1 only
      - 503 model loading                            — retry once after 20s
      - Timeout / network error                      — rule-based fallback
    """
    if not HF_TOKEN:
        print("[classifier] WARNING: HF_TOKEN not set — falling back to rule-based only")
        return _fallback_neutral()

    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type":  "application/json",
    }

    payload = {"inputs": text}

    # ── First attempt ─────────────────────────────────────────
    try:
        resp = requests.post(API_URL, headers=headers, json=payload, timeout=30)
    except requests.exceptions.Timeout:
        print("[classifier] HF API timeout on first attempt")
        return _fallback_neutral()
    except requests.exceptions.ConnectionError as e:
        print(f"[classifier] HF connection error: {e}")
        return _fallback_neutral()

    # ── Handle 503 (model loading / cold start) ───────────────
    if resp.status_code == 503:
        print("[classifier] HF model loading (503) — waiting 25s then retrying")
        time.sleep(25)
        try:
            resp = requests.post(API_URL, headers=headers, json=payload, timeout=45)
        except Exception as e:
            print(f"[classifier] Retry failed: {e}")
            return _fallback_neutral()

    # ── Handle non-200 ────────────────────────────────────────
    if resp.status_code != 200:
        print(f"[classifier] HF API error: HTTP {resp.status_code} — {resp.text[:300]}")
        return _fallback_neutral()

    # ── Parse response ────────────────────────────────────────
    try:
        data = resp.json()
    except Exception as e:
        print(f"[classifier] Failed to parse JSON: {e}")
        return _fallback_neutral()

    return _parse_response(data)


def _parse_response(data) -> dict:
    """
    Parse the HF inference response into a standardised prediction dict.
    Handles both response shapes robustly.
    """
    try:
        if not isinstance(data, list) or len(data) == 0:
            print(f"[classifier] Unexpected response type: {type(data)} — {str(data)[:200]}")
            return _fallback_neutral()

        inner = data[0]

        # ── Shape A: [[{label, score}, ...]] ─────────────────
        if isinstance(inner, list):
            label_map = {}
            for item in inner:
                if isinstance(item, dict) and "label" in item and "score" in item:
                    label_map[item["label"]] = float(item["score"])

            # LABEL_1 = FRAUD, LABEL_0 = LEGITIMATE
            fraud_prob = (
                label_map.get("LABEL_1")
                or label_map.get("FRAUD")
                or label_map.get("1")
            )
            legit_prob = (
                label_map.get("LABEL_0")
                or label_map.get("LEGITIMATE")
                or label_map.get("0")
            )

            if fraud_prob is None:
                print(f"[classifier] Unknown label names: {list(label_map.keys())}")
                return _fallback_neutral()

            legit_prob  = legit_prob if legit_prob is not None else (1.0 - fraud_prob)
            verdict     = "FRAUD" if fraud_prob > 0.5 else "LEGITIMATE"
            confidence  = fraud_prob if verdict == "FRAUD" else legit_prob

            return {
                "verdict":           verdict,
                "confidence":        round(confidence, 4),
                "fraud_probability": round(fraud_prob, 4),
                "model_version":     VERSION,
            }

        # ── Shape B: [{label, score}] ─────────────────────────
        elif isinstance(inner, dict):
            label     = inner.get("label", "LABEL_0")
            score     = float(inner.get("score", 0.5))
            is_fraud  = label in ("LABEL_1", "FRAUD", "1")
            fraud_prob = score if is_fraud else round(1.0 - score, 4)
            verdict    = "FRAUD" if is_fraud else "LEGITIMATE"

            return {
                "verdict":           verdict,
                "confidence":        round(score, 4),
                "fraud_probability": round(fraud_prob, 4),
                "model_version":     VERSION,
            }

        else:
            print(f"[classifier] Unknown inner type: {type(inner)} — {str(inner)[:200]}")
            return _fallback_neutral()

    except Exception as e:
        print(f"[classifier] Parse error: {e}")
        return _fallback_neutral()


def _fallback_neutral() -> dict:
    """
    Returns a NEUTRAL starting point when the model is unavailable.
    fraud_probability=0.0 AND confidence=0.0 signals to the pipeline
    that the model was unavailable — rules/signals will decide the verdict.
    Do NOT return FRAUD here — that creates false positives.
    """
    return {
        "verdict":           "LEGITIMATE",
        "confidence":        0.0,
        "fraud_probability": 0.0,
        "model_version":     f"{VERSION}-fallback",
    }


def predict_batch(texts: list) -> list:
    """Run predict on a list of texts."""
    return [predict(t) for t in texts]
