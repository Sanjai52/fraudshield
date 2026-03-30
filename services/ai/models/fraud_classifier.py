"""
fraud_classifier.py
--------------------
Loads the MuRIL ONNX model for fast local inference.
No HuggingFace API — runs entirely on this server.

Strategy:
  1. Try ONNX model from services/ai/onnx_model/   (fast, ~100ms)
  2. Try raw PyTorch model from ml/registry/        (slower, ~300ms)
  3. Fall back to rule-based signals only           (0ms, still catches most fraud)

The model is lazy-loaded once on first predict() call and cached
for the lifetime of the process.

Labels:
  LABEL_0 = LEGITIMATE
  LABEL_1 = FRAUD
"""

from __future__ import annotations

import os
import threading
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Path resolution ───────────────────────────────────────────
_THIS_DIR  = Path(__file__).resolve().parent   # services/ai/models/
_AI_ROOT   = _THIS_DIR.parent                  # services/ai/
_REPO_ROOT = _AI_ROOT.parent.parent            # fraudshield/

# ONNX model (preferred — fast)
ONNX_PATH    = _AI_ROOT / "onnx_model"

# PyTorch fallback
_ENV_PATH    = os.getenv("MODEL_PATH", "")
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
_mode       = None   # "onnx" | "pytorch" | "fallback"
_lock       = threading.Lock()
_load_done  = False


def _try_load_onnx() -> bool:
    """Attempt to load ONNX model. Returns True on success."""
    global _model, _tokenizer, _mode

    if not ONNX_PATH.exists():
        print(f"[classifier] ONNX model not found at {ONNX_PATH}")
        return False

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
    """Attempt to load raw PyTorch model. Returns True on success."""
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
    """Try ONNX first, then PyTorch, then mark as fallback."""
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
    """Run ONNX inference."""
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
    """Run PyTorch inference."""
    import torch

    inputs = _tokenizer(text, return_tensors="pt", truncation=True, max_length=512, padding=True)
    with torch.no_grad():
        outputs = _model(**inputs)
    probs = torch.softmax(outputs.logits, dim=-1)[0]

    # Determine fraud index from config
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
    """
    Run inference on a single text string.

    Returns:
        verdict:           "FRAUD" | "LEGITIMATE"
        confidence:        float 0-1
        fraud_probability: float 0-1
        model_version:     str
    """
    global _load_done

    # Thread-safe lazy load — only once
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
    """
    Neutral result when no model is available.
    confidence=0.0 signals to the pipeline that the model was unavailable.
    The pipeline's rule-based signals will still decide the verdict.
    """
    return {
        "verdict":           "LEGITIMATE",
        "confidence":        0.0,
        "fraud_probability": 0.0,
        "model_version":     f"{VERSION}-fallback",
    }


def predict_batch(texts: list) -> list:
    return [predict(t) for t in texts]
