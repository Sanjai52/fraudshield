from __future__ import annotations

import os
import threading
from pathlib import Path
from dotenv import load_dotenv
import requests

load_dotenv()

# ── Path resolution ───────────────────────────────────────────
_THIS_DIR  = Path(__file__).resolve().parent
_AI_ROOT   = _THIS_DIR.parent
_REPO_ROOT = _AI_ROOT.parent.parent

# ONNX model (preferred — fast)
ONNX_PATH = _AI_ROOT / "onnx_model"

# 🔥 NEW: Hugging Face model download
MODEL_URL  = "https://huggingface.co/Sanjai1968/fraud/resolve/main/model.onnx"
MODEL_FILE = ONNX_PATH / "model.onnx"


def _download_onnx_if_needed():
    if MODEL_FILE.exists():
        print("[classifier] ONNX already exists")
        return

    print("[classifier] ⬇️ Downloading ONNX model (~950MB)...")

    os.makedirs(ONNX_PATH, exist_ok=True)

    headers = {}
    HF_TOKEN = os.getenv("HF_TOKEN")
    if HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"

    with requests.get(MODEL_URL, headers=headers, stream=True, timeout=60) as r:
        r.raise_for_status()
        with open(MODEL_FILE, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)

    print("[classifier] ✅ ONNX download complete")


# PyTorch fallback
_ENV_PATH = os.getenv("MODEL_PATH", "")
if _ENV_PATH:
    PT_PATH = Path(_ENV_PATH)
    if not PT_PATH.is_absolute():
        PT_PATH = (_AI_ROOT / PT_PATH).resolve()
else:
    PT_PATH = _REPO_ROOT / "ml" / "registry" / "muril-fraud-v1"

VERSION = "v1"

# ── Lazy-load state ───────────────────────────────────────────
_model      = None
_tokenizer  = None
_mode       = None
_lock       = threading.Lock()
_load_done  = False


def _try_load_onnx() -> bool:
    global _model, _tokenizer, _mode

    # 🔥 NEW: ensure model exists (download if needed)
    _download_onnx_if_needed()

    required = ["model.onnx", "config.json", "tokenizer.json"]
    missing  = [f for f in required if not (ONNX_PATH / f).exists()]
    if missing:
        print(f"[classifier] ONNX model incomplete — missing: {missing}")
        return False

    try:
        from optimum.onnxruntime import ORTModelForSequenceClassification
        from transformers import AutoTokenizer

        print(f"[classifier] Loading ONNX model from {ONNX_PATH} ...")
        _tokenizer = AutoTokenizer.from_pretrained(str(ONNX_PATH), local_files_only=True)
        _model     = ORTModelForSequenceClassification.from_pretrained(
            str(ONNX_PATH), local_files_only=True
        )
        _mode = "onnx"
        print(f"[classifier] ✅ ONNX model loaded — fast inference ready")
        return True

    except ImportError:
        print("[classifier] optimum/onnxruntime not installed — trying PyTorch")
        return False
    except Exception as e:
        print(f"[classifier] ONNX load error: {e}")
        return False


def _try_load_pytorch() -> bool:
    global _model, _tokenizer, _mode

    if not PT_PATH.exists():
        print(f"[classifier] PyTorch model not found at {PT_PATH}")
        return False

    required = ["config.json", "model.safetensors", "tokenizer.json", "tokenizer_config.json"]
    missing  = [f for f in required if not (PT_PATH / f).exists()]
    if missing:
        print(f"[classifier] PyTorch model incomplete — missing: {missing}")
        return False

    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification

        print(f"[classifier] Loading PyTorch model from {PT_PATH} ...")
        _tokenizer = AutoTokenizer.from_pretrained(str(PT_PATH), local_files_only=True)
        _model     = AutoModelForSequenceClassification.from_pretrained(
            str(PT_PATH), local_files_only=True
        )
        _model.eval()
        _mode = "pytorch"
        print(f"[classifier] ✅ PyTorch model loaded")
        return True

    except ImportError:
        print("[classifier] transformers not installed")
        return False
    except Exception as e:
        print(f"[classifier] PyTorch load error: {e}")
        return False


def _load_model():
    global _mode, _load_done

    if _try_load_onnx():
        _load_done = True
        return

    if _try_load_pytorch():
        _load_done = True
        return

    _mode      = "fallback"
    _load_done = True
    print("[classifier] ⚠️  No model loaded — using rule-based fallback only")


def _infer_onnx(text: str) -> dict:
    import torch

    inputs  = _tokenizer(text, return_tensors="pt", truncation=True, max_length=512, padding=True)
    outputs = _model(**inputs)
    probs   = torch.softmax(outputs.logits, dim=-1)[0]

    fraud_prob = float(probs[1])
    legit_prob = float(probs[0])
    verdict    = "FRAUD" if fraud_prob > 0.5 else "LEGITIMATE"
    confidence = fraud_prob if verdict == "FRAUD" else legit_prob

    return {
        "verdict":           verdict,
        "confidence":        round(confidence, 4),
        "fraud_probability": round(fraud_prob, 4),
        "model_version":     f"{VERSION}-onnx",
    }


def _infer_pytorch(text: str) -> dict:
    import torch

    inputs = _tokenizer(text, return_tensors="pt", truncation=True, max_length=512, padding=True)
    with torch.no_grad():
        outputs = _model(**inputs)
    probs = torch.softmax(outputs.logits, dim=-1)[0]

    id2label   = getattr(_model.config, "id2label", {0: "LABEL_0", 1: "LABEL_1"})
    fraud_idx  = next(
        (int(k) for k, v in id2label.items() if str(v).upper() in ("LABEL_1", "FRAUD", "1")),
        1
    )
    legit_idx  = 1 - fraud_idx

    fraud_prob = float(probs[fraud_idx])
    legit_prob = float(probs[legit_idx])
    verdict    = "FRAUD" if fraud_prob > 0.5 else "LEGITIMATE"
    confidence = fraud_prob if verdict == "FRAUD" else legit_prob

    return {
        "verdict":           verdict,
        "confidence":        round(confidence, 4),
        "fraud_probability": round(fraud_prob, 4),
        "model_version":     f"{VERSION}",
    }


def predict(text: str) -> dict:
    global _load_done

    with _lock:
        if not _load_done:
            _load_model()

    try:
        if _mode == "onnx":
            return _infer_onnx(text)

        if _mode == "pytorch":
            return _infer_pytorch(text)

    except Exception as e:
        print(f"[classifier] Inference error ({_mode}): {e}")

    return _fallback_neutral()


def _fallback_neutral() -> dict:
    return {
        "verdict":           "LEGITIMATE",
        "confidence":        0.0,
        "fraud_probability": 0.0,
        "model_version":     f"{VERSION}-fallback",
    }


def predict_batch(texts: list) -> list:
    return [predict(t) for t in texts]