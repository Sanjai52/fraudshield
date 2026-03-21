"""
collect_huggingface_datasets.py
--------------------------------
Downloads public phishing and spam datasets from HuggingFace.
No API key needed — all datasets are open access.

Usage:
    cd fraudshield/
    source ml/venv/Scripts/activate
    python ml/scripts/collect/collect_huggingface_datasets.py
"""

from datasets import load_dataset
import pandas as pd
import os

OUTPUT = "ml/data/raw/huggingface"
os.makedirs(OUTPUT, exist_ok=True)


def save(name: str, df: pd.DataFrame, filename: str) -> None:
    path = f"{OUTPUT}/{filename}"
    df.to_csv(path, index=False)
    fraud = int(df["label"].sum())
    legit = int((df["label"] == 0).sum())
    print(f"  ✓ {name:<30} {len(df):>7} rows   fraud={fraud}  legit={legit}")


print("── Downloading HuggingFace datasets ──\n")

# 1. Enron spam (33k emails)
try:
    print("1. Enron spam dataset...")
    ds = load_dataset("SetFit/enron_spam", split="train")
    df = pd.DataFrame({
        "text":   ds["text"],
        "label":  [int(x) for x in ds["label"]],
        "source": "enron",
    })
    save("Enron", df, "enron.csv")
except Exception as e:
    print(f"   ✗ Enron failed: {e}")

# 2. Phishing dataset
try:
    print("2. Phishing dataset (ealvaradob)...")
    ds = load_dataset("ealvaradob/phishing-dataset", split="train")
    df = pd.DataFrame({
        "text":   ds["text"],
        "label":  [int(x) for x in ds["label"]],
        "source": "ealvaradob_phishing",
    })
    save("Phishing-HF", df, "phishing_hf.csv")
except Exception as e:
    print(f"   ✗ Phishing-HF failed: {e}")

# 3. SMS spam via HuggingFace mirror
try:
    print("3. SMS spam (uciml via HF)...")
    ds = load_dataset("uciml/sms_spam_collection", split="train")
    df = pd.DataFrame({
        "text":   ds["sms"],
        "label":  [int(x) for x in ds["label"]],
        "source": "uci_sms_hf",
    })
    save("UCI-SMS-HF", df, "uci_sms_hf.csv")
except Exception as e:
    print(f"   ✗ UCI-SMS-HF failed: {e}")

# 4. Spam emails
try:
    print("4. Spam emails dataset...")
    ds = load_dataset("mariagrandury/spam_dataset", split="train")
    df = pd.DataFrame({
        "text":   ds["text"],
        "label":  [int(x) for x in ds["label"]],
        "source": "spam_emails_hf",
    })
    save("Spam-Emails-HF", df, "spam_emails_hf.csv")
except Exception as e:
    print(f"   ✗ Spam-Emails-HF failed: {e}")

print(f"\n✓ Done — check ml/data/raw/huggingface/")