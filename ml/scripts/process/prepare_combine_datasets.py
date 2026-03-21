"""
prepare_combine_datasets.py
----------------------------
Combines all collected datasets into one clean, balanced, split dataset.

Run after:
    collect_huggingface_datasets.py
    collect_kaggle_datasets.py
    scrape_reddit_fraud_posts.py  (+ manual labelling in Excel)
    generate_synthetic_sms.py

Outputs:
    ml/data/processed/train.csv
    ml/data/processed/val.csv
    ml/data/processed/test_LOCKED.csv   ← never open until final evaluation
    ml/data/processed/dataset_stats.json

Usage:
    cd fraudshield/
    source ml/venv/Scripts/activate
    python ml/scripts/prepare/prepare_combine_datasets.py
"""
from __future__ import annotations
import pandas as pd
import re
import json
import os
from sklearn.model_selection import train_test_split


RAW   = "ml/data/raw"
CLEAN = "ml/data/processed"
os.makedirs(CLEAN, exist_ok=True)

frames = []


def load(path: str, text_col: str, label_col: str,
         label_map: dict = None, source: str = None):
    try:
        df = pd.read_csv(path, encoding="latin-1", on_bad_lines="skip")
        df = df[[text_col, label_col]].copy()
        df.columns = ["text", "label"]
        if label_map:
            df["label"] = df["label"].map(label_map)
        df["label"] = pd.to_numeric(df["label"], errors="coerce")
        df = df.dropna(subset=["label"])
        df["label"]  = df["label"].astype(int)
        df["source"] = source or path
        df = df[df["label"].isin([0, 1])]
        print(f"  ✓ {(source or path):<35} {len(df):>7} rows  "
              f"(fraud={df.label.sum()}, legit={(df.label==0).sum()})")
        return df[["text", "label", "source"]]
    except Exception as e:
        print(f"  ✗ {source or path}: {e}")
        return None


print("── Loading datasets ──\n")

# UCI SMS (Kaggle)
for path in [f"{RAW}/kaggle/uci_sms/spam.csv",
             f"{RAW}/kaggle/uci_sms/SMSSpamCollection"]:
    if os.path.exists(path):
        try:
            df = pd.read_csv(path, encoding="latin-1",
                             usecols=[0, 1], names=["label", "text"],
                             header=0, on_bad_lines="skip")
            df["label"]  = df["label"].map({"spam": 1, "ham": 0})
            df["label"]  = pd.to_numeric(df["label"], errors="coerce")
            df = df.dropna(subset=["label"])
            df["label"]  = df["label"].astype(int)
            df["source"] = "uci_sms"
            df = df[df["label"].isin([0, 1])]
            print(f"  ✓ {'uci_sms':<35} {len(df):>7} rows  "
                  f"(fraud={df.label.sum()}, legit={(df.label==0).sum()})")
            frames.append(df[["text", "label", "source"]])
        except Exception as e:
            print(f"  ✗ uci_sms: {e}")
        break

# UCI SMS (HuggingFace)
p = f"{RAW}/huggingface/uci_sms_hf.csv"
if os.path.exists(p):
    df = load(p, "text", "label", source="uci_sms_hf")
    if df is not None:
        frames.append(df)

# Enron
p = f"{RAW}/huggingface/enron.csv"
if os.path.exists(p):
    df = load(p, "text", "label", source="enron")
    if df is not None:
        frames.append(df)

# Phishing emails (Kaggle)
for path, tc, lc, lm in [
    (f"{RAW}/kaggle/phishing_emails/Phishing_Email.csv",
     "Email Text", "Email Type",
     {"Phishing Email": 1, "Safe Email": 0}),
    (f"{RAW}/kaggle/phishing_emails/phishing_email.csv",
     "text", "label", None),
]:
    if os.path.exists(path):
        df = load(path, tc, lc, label_map=lm, source="phishing_kaggle")
        if df is not None:
            frames.append(df)
        break

# HuggingFace phishing
p = f"{RAW}/huggingface/phishing_hf.csv"
if os.path.exists(p):
    df = load(p, "text", "label", source="hf_phishing")
    if df is not None:
        frames.append(df)

# Spam emails HF
p = f"{RAW}/huggingface/spam_emails_hf.csv"
if os.path.exists(p):
    df = load(p, "text", "label", source="spam_emails_hf")
    if df is not None:
        frames.append(df)

# Synthetic Indian banking SMS
p = f"{RAW}/indian_banking/synthetic_banking_sms.csv"
if os.path.exists(p):
    df = load(p, "text", "label", source="synthetic_indian")
    if df is not None:
        frames.append(df)

# Manually labelled Reddit posts
p = f"{RAW}/indian_banking/reddit_fraud_posts.csv"
if os.path.exists(p):
    df = pd.read_csv(p)
    df = df[df["label"].isin([0, 1])].copy()
    if len(df) > 0:
        df["source"] = "reddit_india"
        frames.append(df[["text", "label", "source"]])
        print(f"  ✓ {'reddit_india':<35} {len(df):>7} rows  (manually labelled)")
    else:
        print("  ⚠  reddit_fraud_posts.csv — no labelled rows yet. "
              "Open in Excel and set label 0 or 1 per row.")

if not frames:
    print("\n✗ No datasets found. Run collect and scrape scripts first.")
    raise SystemExit(1)

# ── Combine ───────────────────────────────────────────────────
print(f"\n── Combining {len(frames)} sources ──")
combined = pd.concat(frames, ignore_index=True)
print(f"Total before cleaning : {len(combined)}")

# ── Strip PII ─────────────────────────────────────────────────
def strip_pii(text: str) -> str:
    t = str(text)
    t = re.sub(r"\b[6-9]\d{9}\b",           "[PHONE]",   t)
    t = re.sub(r"\b\d{10}\b",               "[PHONE]",   t)
    t = re.sub(r"XX\d{4}",                  "XX[ACCT]",  t)
    t = re.sub(r"\b\d{16}\b",               "[CARD]",    t)
    t = re.sub(r"\b[A-Z]{5}\d{4}[A-Z]\b",  "[PAN]",     t)
    t = re.sub(r"\b\d{12}\b",               "[AADHAAR]", t)
    t = re.sub(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
               "[EMAIL]", t)
    return t.strip()

combined["text"] = combined["text"].apply(strip_pii)

# ── Clean ─────────────────────────────────────────────────────
combined["text"]  = combined["text"].astype(str).str.strip()
combined = combined[combined["text"].str.len() > 15]
combined = combined.drop_duplicates(subset=["text"])
combined["label"] = combined["label"].astype(int)
combined = combined[combined["label"].isin([0, 1])]
print(f"Total after cleaning  : {len(combined)}  "
      f"(fraud={combined.label.sum()}, legit={(combined.label==0).sum()})")

# ── Balance — 2:1 legit-to-fraud ─────────────────────────────
fraud_df = combined[combined["label"] == 1]
legit_df = combined[combined["label"] == 0]
target   = min(len(legit_df), len(fraud_df) * 2)
balanced = pd.concat([fraud_df, legit_df.sample(n=target, random_state=42)])
balanced = balanced.sample(frac=1, random_state=42).reset_index(drop=True)
print(f"After balancing       : {len(balanced)}  "
      f"(fraud={balanced.label.sum()}, legit={(balanced.label==0).sum()})")

# ── 70 / 15 / 15 split ───────────────────────────────────────
train, temp = train_test_split(balanced, test_size=0.30, random_state=42,
                                stratify=balanced["label"])
val,   test = train_test_split(temp,     test_size=0.50, random_state=42,
                                stratify=temp["label"])

train.to_csv(f"{CLEAN}/train.csv",       index=False)
val.to_csv(  f"{CLEAN}/val.csv",         index=False)
test.to_csv( f"{CLEAN}/test_LOCKED.csv", index=False)

print(f"\n── Split ──")
print(f"  Train : {len(train)}")
print(f"  Val   : {len(val)}")
print(f"  Test  : {len(test)}  ← LOCKED — do not open until train_evaluate_model.py")

# ── Save stats ────────────────────────────────────────────────
stats = {
    "total_combined": len(combined),
    "balanced_total": len(balanced),
    "train": len(train),
    "val":   len(val),
    "test":  len(test),
    "fraud_in_train": int(train["label"].sum()),
    "legit_in_train": int((train["label"] == 0).sum()),
    "sources": combined["source"].value_counts().to_dict(),
}
with open(f"{CLEAN}/dataset_stats.json", "w") as f:
    json.dump(stats, f, indent=2)

print(f"\n✓ Saved dataset_stats.json")
print(f"\nSource breakdown:")
for src, cnt in sorted(stats["sources"].items(), key=lambda x: -x[1]):
    print(f"  {cnt:>7}  {src}")
print("\n── Ready for train_finetune_model.py ──")