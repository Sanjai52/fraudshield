"""
convert_to_onnx.py
-------------------
Run this ONCE locally to convert your MuRIL model to ONNX format.
The output goes into services/ai/onnx_model/ which is then committed
to git so Railway picks it up automatically.

Usage:
    cd fraudshield/services/ai
    pip install optimum[onnxruntime] onnxruntime
    python convert_to_onnx.py

Output:
    services/ai/onnx_model/
        model.onnx
        config.json
        tokenizer.json
        tokenizer_config.json
        vocab.txt (if present)
        special_tokens_map.json
"""

import os
import sys
import shutil
from pathlib import Path

# ── Resolve model path ────────────────────────────────────────
_THIS   = Path(__file__).resolve().parent          # services/ai/
_ROOT   = _THIS.parent.parent                      # fraudshield/
SOURCE  = _ROOT / "ml" / "registry" / "muril-fraud-v1"
OUTPUT  = _THIS / "onnx_model"

print(f"Source model : {SOURCE}")
print(f"ONNX output  : {OUTPUT}")

if not SOURCE.exists():
    print(f"\nERROR: Source model not found at {SOURCE}")
    sys.exit(1)

required = ["config.json", "model.safetensors", "tokenizer.json", "tokenizer_config.json"]
missing  = [f for f in required if not (SOURCE / f).exists()]
if missing:
    print(f"\nERROR: Missing files in source: {missing}")
    sys.exit(1)

# ── Convert ───────────────────────────────────────────────────
try:
    from optimum.onnxruntime import ORTModelForSequenceClassification
    from transformers import AutoTokenizer
except ImportError:
    print("\nERROR: Missing packages. Run:")
    print("  pip install optimum[onnxruntime] onnxruntime")
    sys.exit(1)

print("\nLoading tokenizer from local path...")
tokenizer = AutoTokenizer.from_pretrained(str(SOURCE), local_files_only=True)

print("Converting model to ONNX (this takes 1-3 minutes)...")
model = ORTModelForSequenceClassification.from_pretrained(
    str(SOURCE),
    export=True,
    local_files_only=True,
)

print(f"Saving ONNX model to {OUTPUT} ...")
OUTPUT.mkdir(parents=True, exist_ok=True)
model.save_pretrained(str(OUTPUT))
tokenizer.save_pretrained(str(OUTPUT))

# Copy val_results for reference
val = SOURCE / "val_results_v3.json"
if val.exists():
    shutil.copy(val, OUTPUT / "val_results_v3.json")

print(f"\n✅ ONNX conversion complete!")
print(f"   Output: {OUTPUT}")
print(f"   Files : {[f.name for f in OUTPUT.iterdir()]}")
print(f"\nNext step: commit onnx_model/ to git, then push to Railway.")
