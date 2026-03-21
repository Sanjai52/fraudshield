"""
train_finetune_model.py
------------------------
Fine-tunes IndicBERT on the cleaned fraud dataset.

Run on Google Colab (free GPU) for best speed — 30-60 minutes.
On laptop CPU only — 3-6 hours.

Prerequisites:
    prepare_combine_datasets.py must have been run first.

Usage:
    cd fraudshield/
    source ml/venv/Scripts/activate
    python ml/scripts/train/train_finetune_model.py
"""

import os
import json
import numpy as np
import pandas as pd
import torch
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback,
)
from datasets import Dataset
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

# ── Config ────────────────────────────────────────────────────
#
# IndicBERT  — recommended — handles Hindi + English natively
# distilbert-base-uncased — English only, faster, smaller
#
MODEL_NAME  = "google/muril-base-cased"
DATA_DIR    = "ml/data/processed"
OUTPUT_DIR  = "ml/registry/muril-fraud-v1"
CKPT_DIR    = "ml/registry/checkpoints"
MAX_LEN     = 256
BATCH_SIZE  = 16
EPOCHS      = 3
LR          = 2e-5

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(CKPT_DIR,   exist_ok=True)

print(f"Model  : {MODEL_NAME}")
print(f"GPU    : {'✓ Available' if torch.cuda.is_available() else '✗ CPU only (slow)'}")
print()

# ── Data ──────────────────────────────────────────────────────
print("Loading data...")
train_df = pd.read_csv(f"{DATA_DIR}/train.csv")
val_df   = pd.read_csv(f"{DATA_DIR}/val.csv")
print(f"  Train : {len(train_df)}  (fraud={train_df.label.sum()})")
print(f"  Val   : {len(val_df)}")
print()

train_ds = Dataset.from_pandas(train_df[["text", "label"]].astype({"label": int}))
val_ds   = Dataset.from_pandas(val_df[["text",  "label"]].astype({"label": int}))

# ── Tokenise ──────────────────────────────────────────────────
print(f"Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

def tokenize(batch):
    return tokenizer(batch["text"], truncation=True,
                     max_length=MAX_LEN, padding="max_length")

train_ds = train_ds.map(tokenize, batched=True, batch_size=256)
val_ds   = val_ds.map(  tokenize, batched=True, batch_size=256)
train_ds = train_ds.rename_column("label", "labels")
val_ds   = val_ds.rename_column(  "label", "labels")
train_ds.set_format("torch", columns=["input_ids", "attention_mask", "labels"])
val_ds.set_format(  "torch", columns=["input_ids", "attention_mask", "labels"])
print()

# ── Model ─────────────────────────────────────────────────────
print(f"Loading model {MODEL_NAME}...")
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=2)
print()


def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=1)
    return {
        "accuracy":  round(accuracy_score( labels, preds), 4),
        "precision": round(precision_score(labels, preds, zero_division=0), 4),
        "recall":    round(recall_score(   labels, preds, zero_division=0), 4),
        "f1":        round(f1_score(       labels, preds, zero_division=0), 4),
    }


args = TrainingArguments(
    output_dir=CKPT_DIR,
    num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    per_device_eval_batch_size=BATCH_SIZE * 2,
    learning_rate=LR,
    weight_decay=0.01,
    warmup_ratio=0.1,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    greater_is_better=True,
    logging_steps=50,
    fp16=torch.cuda.is_available(),
    report_to="none",
    save_total_limit=2,
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=train_ds,
    eval_dataset=val_ds,
    compute_metrics=compute_metrics,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=2)],
)

print("── Training ──")
print(f"Estimated time:  GPU ~30-60 min  |  CPU ~3-6 hours\n")
trainer.train()

model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"\n✓ Model saved → {OUTPUT_DIR}")

# Validation summary
pred_out = trainer.predict(val_ds)
preds    = np.argmax(pred_out.predictions, axis=1)
labels   = val_ds["labels"]

from sklearn.metrics import confusion_matrix
tn, fp, fn, tp = confusion_matrix(labels, preds).ravel()
fpr = fp / (fp + tn) if (fp + tn) > 0 else 0

print("\n── Validation results ──")
print(f"  Accuracy  : {accuracy_score(labels, preds):.4f}")
print(f"  Precision : {precision_score(labels, preds):.4f}")
print(f"  Recall    : {recall_score(labels, preds):.4f}")
print(f"  F1        : {f1_score(labels, preds):.4f}")
print(f"  FP rate   : {fpr:.4f}  (target < 0.03)")

with open(f"{OUTPUT_DIR}/val_results.json", "w") as f:
    json.dump({"f1": round(f1_score(labels, preds), 4),
               "false_positive_rate": round(fpr, 4)}, f, indent=2)

print("\n── Next: run train_evaluate_model.py ──")