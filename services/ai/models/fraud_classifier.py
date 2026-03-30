import os
import requests
from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")
MODEL_ID = "Sanjai1968/muril-fraud-v1"

API_URL = f"https://api-inference.huggingface.co/models/{MODEL_ID}"

headers = {
    "Authorization": f"Bearer {HF_TOKEN}"
}

VERSION = "v1"


def predict(text: str) -> dict:
    try:
        response = requests.post(
            API_URL,
            headers=headers,
            json={"inputs": text},
            timeout=30
        )

        if response.status_code != 200:
            return {
                "verdict": "FRAUD",
                "confidence": 0.5,
                "fraud_probability": 0.5,
                "model_version": VERSION,
            }

        data = response.json()

        # HF returns list of predictions
        result = data[0]

        label = result["label"]
        score = result["score"]

        fraud_prob = score if label == "LABEL_1" else 1 - score

        return {
            "verdict": "FRAUD" if label == "LABEL_1" else "LEGITIMATE",
            "confidence": round(score, 4),
            "fraud_probability": round(fraud_prob, 4),
            "model_version": VERSION,
        }

    except Exception as e:
        print("HF API error:", e)

        return {
            "verdict": "FRAUD",
            "confidence": 0.0,
            "fraud_probability": 0.0,
            "model_version": VERSION,
        }


def predict_batch(texts: list[str]) -> list[dict]:
    return [predict(t) for t in texts]