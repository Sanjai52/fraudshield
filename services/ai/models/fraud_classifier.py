import os
import requests
from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN", "")
MODEL_ID  = "Sanjai1968/muril-fraud-v1"
API_URL   = f"https://api-inference.huggingface.co/models/{MODEL_ID}"
VERSION   = "v1"

headers = {"Authorization": f"Bearer {HF_TOKEN}"}


def predict(text: str) -> dict:
    """
    Calls HuggingFace inference API.

    HF binary classifier response shape:
        [[{"label": "LABEL_0", "score": 0.89},
          {"label": "LABEL_1", "score": 0.11}]]

    LABEL_0 = LEGITIMATE (0)
    LABEL_1 = FRAUD (1)
    """
    if not HF_TOKEN:
        print("WARNING: HF_TOKEN not set — using rule-based fallback only")
        return _fallback_neutral()

    try:
        response = requests.post(
            API_URL,
            headers=headers,
            json={"inputs": text},
            timeout=30,
        )

        if response.status_code == 503:
            # Model is loading — wait and retry once
            import time
            time.sleep(20)
            response = requests.post(
                API_URL,
                headers=headers,
                json={"inputs": text},
                timeout=40,
            )

        if response.status_code != 200:
            print(f"HF API error: HTTP {response.status_code} — {response.text[:200]}")
            return _fallback_neutral()

        data = response.json()

        # Handle both response shapes:
        # Shape A: [[{label, score}, {label, score}]]  ← binary classifier, all labels
        # Shape B: [{label, score}]                    ← single top prediction
        if isinstance(data, list) and len(data) > 0:
            inner = data[0]

            if isinstance(inner, list):
                # Shape A — find LABEL_1 (fraud) score explicitly
                label_map = {item["label"]: item["score"] for item in inner}
                fraud_prob = label_map.get("LABEL_1", label_map.get("FRAUD", None))
                legit_prob = label_map.get("LABEL_0", label_map.get("LEGITIMATE", None))

                if fraud_prob is None:
                    print(f"Unexpected label names: {list(label_map.keys())}")
                    return _fallback_neutral()

                verdict    = "FRAUD" if fraud_prob > 0.5 else "LEGITIMATE"
                confidence = fraud_prob if verdict == "FRAUD" else (legit_prob or 1 - fraud_prob)

                return {
                    "verdict":           verdict,
                    "confidence":        round(confidence, 4),
                    "fraud_probability": round(fraud_prob, 4),
                    "model_version":     VERSION,
                }

            elif isinstance(inner, dict):
                # Shape B — single top prediction
                label      = inner.get("label", "LABEL_0")
                score      = inner.get("score", 0.5)
                is_fraud   = label in ("LABEL_1", "FRAUD", "1")
                fraud_prob = score if is_fraud else 1.0 - score
                verdict    = "FRAUD" if is_fraud else "LEGITIMATE"

                return {
                    "verdict":           verdict,
                    "confidence":        round(score, 4),
                    "fraud_probability": round(fraud_prob, 4),
                    "model_version":     VERSION,
                }

        print(f"Unexpected HF response shape: {type(data)} — {str(data)[:200]}")
        return _fallback_neutral()

    except requests.exceptions.Timeout:
        print("HF API timeout — model may be cold starting")
        return _fallback_neutral()
    except Exception as e:
        print(f"HF API exception: {e}")
        return _fallback_neutral()


def _fallback_neutral() -> dict:
    """
    Returns a neutral result when the model is unavailable.
    The pipeline's rule-based signals will still run and can escalate.
    NOT a definitive FRAUD — let rules decide.
    """
    return {
        "verdict":           "LEGITIMATE",  # neutral starting point for rules
        "confidence":        0.0,           # 0.0 signals model was unavailable
        "fraud_probability": 0.0,
        "model_version":     f"{VERSION}-fallback",
    }


def predict_batch(texts: list) -> list:
    return [predict(t) for t in texts]