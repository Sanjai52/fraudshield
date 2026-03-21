"""
train_evaluate_model.py
------------------------
Final evaluation on the locked test set.
Run this ONCE AND ONLY ONCE after training is complete.
This produces the model card — the first entry on the transparency dashboard.

Usage:
    cd fraudshield/
    source ml/venv/Scripts/activate
    python ml/scripts/train/train_evaluate_model.py
"""

import json
import pandas as pd
import numpy as np
import torch
from datetime import datetime
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.metrics import (
    classification_report, confusion_matrix,
    accuracy_score, f1_score, precision_score, recall_score,
)

MODEL_DIR = "ml/registry/muril-fraud-v1"
TEST_FILE = "ml/data/processed/test_LOCKED.csv"
CARD_OUT  = "ml/registry/model-card-v1.json"

print("── Final evaluation on test_LOCKED.csv ──")
print("⚠  Run this only once.\n")

tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model     = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
model.eval()

df = pd.read_csv(TEST_FILE)
print(f"Test set : {len(df)} rows  "
      f"(fraud={df.label.sum()}, legit={(df.label==0).sum()})\n")


def predict_batch(texts: list, batch_size: int = 64):
    all_preds, all_probs = [], []
    for i in range(0, len(texts), batch_size):
        batch  = list(texts[i:i+batch_size])
        inputs = tokenizer(batch, truncation=True, max_length=256,
                           padding=True, return_tensors="pt")
        with torch.no_grad():
            logits = model(**inputs).logits
        probs = torch.softmax(logits, dim=1)
        all_preds.extend(logits.argmax(dim=1).tolist())
        all_probs.extend(probs[:, 1].tolist())
    return all_preds, all_probs


preds, probs = predict_batch(df["text"].tolist())
labels       = df["label"].tolist()

print("── Classification report ──")
print(classification_report(labels, preds,
                             target_names=["Legitimate", "Fraud"], digits=4))

tn, fp, fn, tp = confusion_matrix(labels, preds).ravel()
fpr = fp / (fp + tn) if (fp + tn) > 0 else 0

print(f"Confusion matrix:")
print(f"  True  Neg  (legit correct)   : {tn}")
print(f"  False Pos  (legit → fraud)   : {fp}  ← minimize")
print(f"  False Neg  (fraud missed)    : {fn}  ← minimize")
print(f"  True  Pos  (fraud correct)   : {tp}")
print(f"\nFalse positive rate : {fpr:.4f}")

# Show a few wrong predictions
df["pred"] = preds
df["prob"] = [round(p, 3) for p in probs]
wrong = df[df["label"] != df["pred"]]
if len(wrong) > 0:
    print(f"\n── Sample wrong predictions (first 5) ──")
    for _, row in wrong.head(5).iterrows():
        actual  = "FRAUD"  if row["label"] == 1 else "LEGIT"
        guessed = "FRAUD"  if row["pred"]  == 1 else "LEGIT"
        print(f"  Actual={actual}  Predicted={guessed} ({row['prob']:.2f})")
        print(f"  {str(row['text'])[:100]}...\n")

# Save model card
card = {
    "version":             "v0",
    "base_model":          "google/muril-base-cased",
    "evaluated_date":      datetime.now().isoformat(),
    "test_set_size":       len(df),
    "accuracy":            round(accuracy_score( labels, preds), 4),
    "precision":           round(precision_score(labels, preds), 4),
    "recall":              round(recall_score(   labels, preds), 4),
    "f1":                  round(f1_score(       labels, preds), 4),
    "false_positive_rate": round(fpr, 4),
    "true_positives":      int(tp),
    "false_positives":     int(fp),
    "true_negatives":      int(tn),
    "false_negatives":     int(fn),
    "notes": "Initial model — trained on public datasets + synthetic Indian banking SMS",
}
with open(CARD_OUT, "w") as f:
    json.dump(card, f, indent=2)
print(f"\n✓ Model card saved → {CARD_OUT}")

# Pass / fail
f1  = card["f1"]
fpr = card["false_positive_rate"]
print()
print("── Readiness check ──")
print(f"  F1 score          {f1:.4f}   {'✓ PASS' if f1 >= 0.90 else '✗ FAIL — collect more data, retrain'}")
print(f"  False positive    {fpr:.4f}   {'✓ PASS' if fpr <= 0.03 else '✗ FAIL — add more legit messages, retrain'}")

if f1 >= 0.90 and fpr <= 0.03:
    print()
    print("✓ Model is ready for Phase 1 build.")
    print(f"  Copy {MODEL_DIR}/ into services/ai/model_registry/v0/")
    print("  FastAPI will load it from Day 1.")