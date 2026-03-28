"""
train_finetune_model_v2.py
---------------------------
Fine-tunes MuRIL on the combined fraud dataset.

Changes vs v1:
  - EPOCHS = 5        (was 3)
  - LR     = 1e-5     (was 2e-5)  — MuRIL fine-tuning is sensitive
  - WeightedTrainer   — handles class imbalance via CrossEntropyLoss weights
  - Saves to muril-fraud-v2

Prerequisites:
    1. python ml/scripts/generate/generate_synthetic_sms_v2.py
    2. python ml/scripts/collect/collect_huggingface_datasets_v2.py
    3. python ml/scripts/process/prepare_combine_datasets.py

Run:
    cd fraudshield/
    python ml/scripts/train/train_finetune_model_v2.py

Time: GPU ~40-70 min | CPU ~5-8 hours (use Colab for free GPU)
"""

import os
import json
import numpy as np
import pandas as pd
import torch
from torch.nn import CrossEntropyLoss
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback,
)
from datasets import Dataset
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix,
)

# ── Config ────────────────────────────────────────────────────
MODEL_NAME = "google/muril-base-cased"
DATA_DIR   = "ml/data/processed"
OUTPUT_DIR = "ml/registry/muril-fraud-v2"
CKPT_DIR   = "ml/registry/checkpoints-v2"
MAX_LEN    = 256
BATCH_SIZE = 16
EPOCHS     = 5        # was 3 — early stopping prevents overfit
LR         = 1e-5     # was 2e-5 — MuRIL is sensitive to LR

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(CKPT_DIR,   exist_ok=True)

print(f"Model  : {MODEL_NAME}")
print(f"GPU    : {'✓ Available — ' + torch.cuda.get_device_name(0) if torch.cuda.is_available() else '✗ CPU only (slow — use Colab)'}")
print()

# ── Data ──────────────────────────────────────────────────────
print("Loading data...")
train_df = pd.read_csv(f"{DATA_DIR}/train.csv")
val_df   = pd.read_csv(f"{DATA_DIR}/val.csv")

print(f"  Train : {len(train_df):,}  (fraud={int(train_df.label.sum()):,}  legit={int((train_df.label==0).sum()):,})")
print(f"  Val   : {len(val_df):,}")
print()

train_ds = Dataset.from_pandas(train_df[["text", "label"]].astype({"label": int}))
val_ds   = Dataset.from_pandas(val_df[["text",  "label"]].astype({"label": int}))

# ── Tokenise ──────────────────────────────────────────────────
print("Loading tokenizer...")
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

# ── Class weights (handles imbalance) ─────────────────────────
fraud_count = int(train_df["label"].sum())
legit_count = len(train_df) - fraud_count
ratio       = legit_count / fraud_count
print(f"Class ratio legit/fraud: {ratio:.2f}  →  weight=[1.0, {ratio:.2f}]")

weight = torch.tensor([1.0, ratio], dtype=torch.float)
if torch.cuda.is_available():
    weight = weight.cuda()


class WeightedTrainer(Trainer):
    """Custom Trainer that applies class-weighted CrossEntropyLoss."""
    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        loss = CrossEntropyLoss(weight=weight)(outputs.logits, labels)
        return (loss, outputs) if return_outputs else loss


# ── Metrics ───────────────────────────────────────────────────
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=1)
    return {
        "accuracy":  round(accuracy_score( labels, preds), 4),
        "precision": round(precision_score(labels, preds, zero_division=0), 4),
        "recall":    round(recall_score(   labels, preds, zero_division=0), 4),
        "f1":        round(f1_score(       labels, preds, zero_division=0), 4),
    }


# ── Training args ─────────────────────────────────────────────
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

trainer = WeightedTrainer(
    model=model,
    args=args,
    train_dataset=train_ds,
    eval_dataset=val_ds,
    compute_metrics=compute_metrics,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=2)],
)

# ── Train ─────────────────────────────────────────────────────
print("── Training (v2) ──")
print(f"  Epochs (max) : {EPOCHS}  (early stopping patience=2)")
print(f"  LR           : {LR}")
print(f"  Batch size   : {BATCH_SIZE}")
print(f"  Estimated    : GPU ~40-70 min  |  CPU ~5-8 hrs\n")

trainer.train()

model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"\n✓ Model saved → {OUTPUT_DIR}")

# ── Validation summary ────────────────────────────────────────
print("\n── Validation results (v2) ──")
pred_out = trainer.predict(val_ds)
preds    = np.argmax(pred_out.predictions, axis=1)
labels   = val_ds["labels"]

tn, fp, fn, tp = confusion_matrix(labels, preds).ravel()
fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
f1  = f1_score(labels, preds)

print(f"  Accuracy  : {accuracy_score(labels, preds):.4f}")
print(f"  Precision : {precision_score(labels, preds):.4f}")
print(f"  Recall    : {recall_score(labels, preds):.4f}")
print(f"  F1        : {f1:.4f}")
print(f"  FP rate   : {fpr:.4f}  (target < 0.03)")
print(f"  TP={tp}  FP={fp}  TN={tn}  FN={fn}")

results = {
    "model_version":      "muril-fraud-v2",
    "base_model":         MODEL_NAME,
    "train_size":         len(train_df),
    "val_size":           len(val_df),
    "accuracy":           round(accuracy_score( labels, preds), 4),
    "precision":          round(precision_score(labels, preds), 4),
    "recall":             round(recall_score(   labels, preds), 4),
    "f1":                 round(f1, 4),
    "false_positive_rate": round(fpr, 4),
    "epochs_config":      EPOCHS,
    "lr":                 LR,
    "class_weights":      [1.0, round(ratio, 3)],
}
with open(f"{OUTPUT_DIR}/val_results_v2.json", "w") as f:
    json.dump(results, f, indent=2)
print(f"\n✓ Results saved → {OUTPUT_DIR}/val_results_v2.json")

# Pass/fail check
print("\n── Readiness check ──")
print(f"  F1         {f1:.4f}   {'✓ PASS' if f1 >= 0.92 else '✗ FAIL — collect more Indian data'}")
print(f"  FP rate    {fpr:.4f}   {'✓ PASS' if fpr <= 0.03 else '✗ FAIL — add more legit messages'}")
print("\n── Next: run train_evaluate_model.py on test_LOCKED.csv ──")
