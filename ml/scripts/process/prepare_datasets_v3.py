"""
prepare_datasets_v3.py
-----------------------
Runs LOCALLY. Combines every raw data source into clean, balanced
train / val / test CSVs for upload to Google Colab.

Run order:
    1. python ml/scripts/generate/generate_synthetic_sms_v2.py   (already done)
    2. python ml/scripts/process/prepare_datasets_v3.py          ← this script

Then upload ml/data/processed/ to Google Drive and run the Colab notebook
(train-only version) — no data prep needed on Colab, saves GPU quota.

Output:
    ml/data/processed/train_v3.csv
    ml/data/processed/val_v3.csv
    ml/data/processed/test_v3_LOCKED.csv
    ml/data/processed/dataset_stats_v3.json

Usage:
    cd fraudshield/
    python ml/scripts/process/prepare_datasets_v3.py
"""
from __future__ import annotations
import pandas as pd
import re, json, os
from sklearn.model_selection import train_test_split

RAW   = "ml/data/raw"
CLEAN = "ml/data/processed"
os.makedirs(CLEAN, exist_ok=True)

frames: list[pd.DataFrame] = []

# ── Helpers ────────────────────────────────────────────────────
def strip_pii(text: str) -> str:
    t = str(text)
    t = re.sub(r"\b[6-9]\d{9}\b",          "[PHONE]",   t)
    t = re.sub(r"\b\d{10}\b",              "[PHONE]",   t)
    t = re.sub(r"XX\d{4}",                 "XX[ACCT]",  t)
    t = re.sub(r"\b\d{16}\b",              "[CARD]",    t)
    t = re.sub(r"\b[A-Z]{5}\d{4}[A-Z]\b", "[PAN]",     t)
    t = re.sub(r"\b\d{12}\b",              "[AADHAAR]", t)
    t = re.sub(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", "[EMAIL]", t)
    return t.strip()

def add(df: pd.DataFrame | None, source: str) -> None:
    if df is None or len(df) == 0:
        return
    df = df.copy()
    df["source"] = source
    frames.append(df[["text", "label", "source"]])

def load(path, text_col, label_col, label_map=None, source=None,
         max_rows=None, encoding="latin-1") -> pd.DataFrame | None:
    src = source or os.path.basename(path)
    try:
        df = pd.read_csv(path, encoding=encoding,
                         on_bad_lines="skip", low_memory=False)
        df = df[[text_col, label_col]].copy()
        df.columns = ["text", "label"]
        if label_map:
            df["label"] = df["label"].map(label_map)
        df["label"] = pd.to_numeric(df["label"], errors="coerce")
        df = df.dropna(subset=["label"])
        df["label"] = df["label"].astype(int)
        df = df[df["label"].isin([0, 1])]
        if max_rows and len(df) > max_rows:
            df = df.sample(n=max_rows, random_state=42)
        print(f"  ✓ {src:<45} {len(df):>7} rows  "
              f"(fraud={df.label.sum():,}  legit={(df.label==0).sum():,})")
        return df[["text", "label"]]
    except Exception as e:
        print(f"  ✗ {src}: {e}")
        return None

print("── Loading datasets ──\n")

# ── 1. Synthetic Indian banking SMS (v2 expanded) ─────────────
df = load(f"{RAW}/indian-banking/synthetic_banking_sms.csv",
          "text", "label", source="synthetic_indian")
add(df, "synthetic_indian")

# ── 2. FraudShield curated Indian dataset ─────────────────────
df = load(f"{RAW}/indian-banking/fraudshield_curated.csv",
          "text", "label", source="fraudshield_curated")
add(df, "fraudshield_curated")

# ── 3. HuggingFace Enron (already text+label format) ─────────
# file is large — sample reasonably
df = load(f"{RAW}/huggingface/enron.csv",
          "text", "label", source="enron_hf", max_rows=35000)
add(df, "enron_hf")

# ── 4. HuggingFace Phishing dataset (capped — dominates otherwise) ──
df = load(f"{RAW}/huggingface/phishing_hf.csv",
          "text", "label", source="hf_phishing", max_rows=40000)
add(df, "hf_phishing")

# ── 5. HuggingFace SMS spam ───────────────────────────────────
df = load(f"{RAW}/huggingface/sms_spam_hf.csv",
          "text", "label", source="sms_spam_hf")
add(df, "sms_spam_hf")

# ── 6. Kaggle UCI SMS spam (v1=label, v2=text) ────────────────
p = f"{RAW}/kaggle/uci-sms/spam.csv"
if os.path.exists(p):
    try:
        df = pd.read_csv(p, encoding="latin-1", on_bad_lines="skip",
                         usecols=[0, 1], names=["label", "text"], header=0)
        df["label"] = df["label"].map({"spam": 1, "ham": 0})
        df = df.dropna(subset=["label"])
        df["label"] = df["label"].astype(int)
        print(f"  ✓ {'uci_sms':<45} {len(df):>7} rows  "
              f"(fraud={df.label.sum()}, legit={(df.label==0).sum()})")
        add(df[["text", "label"]], "uci_sms")
    except Exception as e:
        print(f"  ✗ uci_sms: {e}")

# Kaggle SMS spam (Category / Message format)
p = f"{RAW}/kaggle/sms-spam/SPAM text message 20170820 - Data.csv"
if os.path.exists(p):
    try:
        df = pd.read_csv(p, encoding="latin-1", on_bad_lines="skip")
        df = df[["Category", "Message"]].copy()
        df.columns = ["label", "text"]
        df["label"] = df["label"].map({"Spam": 1, "Ham": 0, "spam": 1, "ham": 0})
        df = df.dropna(subset=["label"])
        df["label"] = df["label"].astype(int)
        print(f"  ✓ {'sms_spam_kaggle':<45} {len(df):>7} rows")
        add(df[["text", "label"]], "sms_spam_kaggle")
    except Exception as e:
        print(f"  ✗ sms_spam_kaggle: {e}")

# ── 7. Kaggle banking-phishing phishing_email.csv ────────────
p = f"{RAW}/kaggle/banking-phishing/phishing_email.csv"
if os.path.exists(p):
    df = load(p, "text_combined", "label",
              source="phishing_email_kaggle", max_rows=30000)
    add(df, "phishing_email_kaggle")

# ── 8. Kaggle phishing emails (Phishing_Email.csv) ───────────
p = f"{RAW}/kaggle/phishing-emails/Phishing_Email.csv"
if os.path.exists(p):
    df = load(p, "Email Text", "Email Type",
              label_map={"Phishing Email": 1, "Safe Email": 0},
              source="phishing_email2_kaggle", max_rows=25000)
    add(df, "phishing_email2_kaggle")

# ── 9. Kaggle Enron (subject + body) ─────────────────────────
p = f"{RAW}/kaggle/banking-phishing/Enron.csv"
if os.path.exists(p):
    try:
        df = pd.read_csv(p, encoding="latin-1", on_bad_lines="skip",
                         low_memory=False)
        # combine subject + body for richer text
        df["text"] = df.get("subject", "").fillna("").astype(str) + " " + \
                     df.get("body", "").fillna("").astype(str)
        df["text"] = df["text"].str.strip()
        df["label"] = pd.to_numeric(df.get("label", df.iloc[:, -1]), errors="coerce")
        df = df.dropna(subset=["label"])
        df["label"] = df["label"].astype(int)
        df = df[df["label"].isin([0, 1])]
        df = df[df["text"].str.len() > 20]
        if len(df) > 30000:
            df = df.sample(n=30000, random_state=42)
        print(f"  ✓ {'enron_kaggle':<45} {len(df):>7} rows  "
              f"(fraud={df.label.sum():,}  legit={(df.label==0).sum():,})")
        add(df[["text", "label"]], "enron_kaggle")
    except Exception as e:
        print(f"  ✗ enron_kaggle: {e}")

# ── 10. SpamAssassin (sender+subject+body combined) ───────────
p = f"{RAW}/kaggle/banking-phishing/SpamAssasin.csv"
if os.path.exists(p):
    try:
        df = pd.read_csv(p, encoding="latin-1", on_bad_lines="skip",
                         low_memory=False)
        cols = [c for c in ["subject","body","text"] if c in df.columns]
        df["text"] = df[cols].fillna("").astype(str).agg(" ".join, axis=1).str.strip()
        label_col = "label" if "label" in df.columns else df.columns[-1]
        df["label"] = pd.to_numeric(df[label_col], errors="coerce")
        df = df.dropna(subset=["label"])
        df["label"] = df["label"].astype(int)
        df = df[df["label"].isin([0, 1]) & (df["text"].str.len() > 20)]
        if len(df) > 25000:
            df = df.sample(n=25000, random_state=42)
        print(f"  ✓ {'spamassassin':<45} {len(df):>7} rows  "
              f"(fraud={df.label.sum():,}  legit={(df.label==0).sum():,})")
        add(df[["text", "label"]], "spamassassin")
    except Exception as e:
        print(f"  ✗ spamassassin: {e}")

# ── 11. Nigerian Fraud emails ─────────────────────────────────
p = f"{RAW}/kaggle/banking-phishing/Nigerian_Fraud.csv"
if os.path.exists(p):
    try:
        df = pd.read_csv(p, encoding="latin-1", on_bad_lines="skip",
                         low_memory=False)
        cols = [c for c in ["subject","body","text"] if c in df.columns]
        df["text"] = df[cols].fillna("").astype(str).agg(" ".join, axis=1).str.strip()
        # Nigerian fraud = all fraud (label=1)
        df["label"] = 1
        df = df[df["text"].str.len() > 20]
        if len(df) > 15000:
            df = df.sample(n=15000, random_state=42)
        print(f"  ✓ {'nigerian_fraud':<45} {len(df):>7} rows  (all fraud)")
        add(df[["text", "label"]], "nigerian_fraud")
    except Exception as e:
        print(f"  ✗ nigerian_fraud: {e}")

# ── 12. Ling spam dataset ──────────────────────────────────────
p = f"{RAW}/kaggle/banking-phishing/Ling.csv"
if os.path.exists(p):
    try:
        df = pd.read_csv(p, encoding="latin-1", on_bad_lines="skip")
        cols = [c for c in ["subject","body","text"] if c in df.columns]
        df["text"] = df[cols].fillna("").astype(str).agg(" ".join, axis=1).str.strip()
        label_col = "label" if "label" in df.columns else df.columns[-1]
        df["label"] = pd.to_numeric(df[label_col], errors="coerce")
        df = df.dropna(subset=["label"])
        df["label"] = df["label"].astype(int)
        df = df[df["label"].isin([0, 1]) & (df["text"].str.len() > 20)]
        print(f"  ✓ {'ling_spam':<45} {len(df):>7} rows  "
              f"(fraud={df.label.sum()}, legit={(df.label==0).sum()})")
        add(df[["text", "label"]], "ling_spam")
    except Exception as e:
        print(f"  ✗ ling_spam: {e}")

# ── Combine ────────────────────────────────────────────────────
if not frames:
    print("\n✗ No datasets found. Run generate + collect scripts first.")
    raise SystemExit(1)

print(f"\n── Combining {len(frames)} sources ──")
combined = pd.concat(frames, ignore_index=True)
print(f"Total before cleaning : {len(combined):,}")

# Strip PII
print("Stripping PII...")
combined["text"] = combined["text"].apply(strip_pii)

# Clean
combined["text"] = combined["text"].astype(str).str.strip()
combined = combined[combined["text"].str.len() > 15]
combined = combined.drop_duplicates(subset=["text"])
combined["label"] = combined["label"].astype(int)
combined = combined[combined["label"].isin([0, 1])]
print(f"Total after cleaning  : {len(combined):,}  "
      f"(fraud={combined.label.sum():,}  legit={(combined.label==0).sum():,})")

# Balance — 1.5:1 legit-to-fraud (tighter than before to help recall)
fraud_df = combined[combined["label"] == 1]
legit_df = combined[combined["label"] == 0]
RATIO = 1.5
target = min(len(legit_df), int(len(fraud_df) * RATIO))
balanced = pd.concat([fraud_df, legit_df.sample(n=target, random_state=42)])
balanced = balanced.sample(frac=1, random_state=42).reset_index(drop=True)
print(f"After balancing (1.5:1): {len(balanced):,}  "
      f"(fraud={balanced.label.sum():,}  legit={(balanced.label==0).sum():,})")

# 70 / 15 / 15 split
train, temp = train_test_split(balanced, test_size=0.30, random_state=42,
                               stratify=balanced["label"])
val,   test = train_test_split(temp,     test_size=0.50, random_state=42,
                               stratify=temp["label"])

train.to_csv(f"{CLEAN}/train_v3.csv",       index=False)
val.to_csv(  f"{CLEAN}/val_v3.csv",         index=False)
test.to_csv( f"{CLEAN}/test_v3_LOCKED.csv", index=False)

train_mb = os.path.getsize(f"{CLEAN}/train_v3.csv") / 1024 / 1024
val_mb   = os.path.getsize(f"{CLEAN}/val_v3.csv")   / 1024 / 1024
test_mb  = os.path.getsize(f"{CLEAN}/test_v3_LOCKED.csv") / 1024 / 1024

print(f"\n── Split ──")
print(f"  Train : {len(train):,}  ({train_mb:.1f} MB)")
print(f"  Val   : {len(val):,}  ({val_mb:.1f} MB)")
print(f"  Test  : {len(test):,}  ({test_mb:.1f} MB)  ← LOCKED")

# Source breakdown
print(f"\nSource breakdown:")
for src, cnt in combined["source"].value_counts().items():
    pct = cnt / len(combined) * 100
    print(f"  {cnt:>8,}  ({pct:4.1f}%)  {src}")

# Stats JSON
stats = {
    "version":          "v3",
    "total_combined":   len(combined),
    "balanced_total":   len(balanced),
    "balance_ratio":    RATIO,
    "train":            len(train),
    "val":              len(val),
    "test":             len(test),
    "fraud_in_train":   int(train["label"].sum()),
    "legit_in_train":   int((train["label"] == 0).sum()),
    "sources":          combined["source"].value_counts().to_dict(),
}
with open(f"{CLEAN}/dataset_stats_v3.json", "w") as f:
    json.dump(stats, f, indent=2)

print(f"\n✓ Saved to {CLEAN}/")
print(f"  train_v3.csv          {len(train):,} rows  {train_mb:.1f} MB")
print(f"  val_v3.csv            {len(val):,} rows  {val_mb:.1f} MB")
print(f"  test_v3_LOCKED.csv    {len(test):,} rows  {test_mb:.1f} MB")
print(f"  dataset_stats_v3.json")
print(f"\n── Next steps ──")
print(f"  1. Upload ml/data/processed/ to Google Drive:")
print(f"     My Drive/fraudshield/ml/data/processed/")
print(f"  2. Open ml/notebooks/fraudshield_v3_train_only.ipynb on Colab")
print(f"  3. Train with T4 GPU (~60-90 min)")
