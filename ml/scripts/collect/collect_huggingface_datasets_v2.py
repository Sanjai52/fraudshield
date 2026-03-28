"""
collect_huggingface_datasets_v2.py
------------------------------------
Downloads HuggingFace datasets for fraud detection.

Verified working datasets:
  1. SetFit/enron_spam          — 31k emails
  2. ealvaradob/phishing-dataset — 77k phishing texts
  3. sms_spam                   — 5.5k SMS (UCI)
  4. mshenoda/email-spam        — email spam
  5. shawhin/phishing-site-classification — phishing URLs
  6. berkaykis/financial_fraud_detection_dataset

Run:
    cd fraudshield/
    python ml/scripts/collect/collect_huggingface_datasets_v2.py
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
    print(f"  ✓ {name:<35} {len(df):>7} rows   fraud={fraud}  legit={legit}")


print("── Downloading HuggingFace datasets v2 ──\n")

# 1. Enron spam (31k emails) — verified ✓
try:
    print("1. Enron spam...")
    ds = load_dataset("SetFit/enron_spam", split="train")
    df = pd.DataFrame({"text": ds["text"],
                       "label": [int(x) for x in ds["label"]],
                       "source": "enron"})
    save("Enron", df, "enron.csv")
except Exception as e:
    print(f"   ✗ Enron: {e}")

# 2. Phishing dataset (ealvaradob) — needs trust_remote_code — verified ✓
try:
    print("2. Phishing (ealvaradob)...")
    ds = load_dataset("ealvaradob/phishing-dataset", split="train",
                      trust_remote_code=True)
    df = pd.DataFrame({"text": ds["text"],
                       "label": [int(x) for x in ds["label"]],
                       "source": "ealvaradob_phishing"})
    save("Phishing-HF", df, "phishing_hf.csv")
except Exception as e:
    print(f"   ✗ Phishing-HF: {e}")

# 3. sms_spam — verified ✓
try:
    print("3. sms_spam (canonical)...")
    ds = load_dataset("sms_spam", split="train")
    df = pd.DataFrame({"text": ds["sms"],
                       "label": [int(x) for x in ds["label"]],
                       "source": "sms_spam_hf"})
    save("SMS-Spam-HF", df, "sms_spam_hf.csv")
except Exception as e:
    print(f"   ✗ sms_spam: {e}")

# 4. Email spam — mshenoda/email-spam
try:
    print("4. Email spam (mshenoda/email-spam)...")
    ds = load_dataset("mshenoda/email-spam", split="train")
    df = pd.DataFrame({"text": ds["text"],
                       "label": [int(x) for x in ds["label"]],
                       "source": "mshenoda_email_spam"})
    save("Email-Spam-mshenoda", df, "spam_emails_hf.csv")
except Exception as e:
    print(f"   ✗ mshenoda/email-spam: {e}")
    # Fallback
    try:
        print("   ↳ Trying fallback: TrainingDataPro/spam-emails...")
        ds = load_dataset("TrainingDataPro/spam-emails", split="train")
        col_t = "text" if "text" in ds.column_names else ds.column_names[0]
        col_l = "label" if "label" in ds.column_names else ds.column_names[1]
        df = pd.DataFrame({"text": ds[col_t],
                           "label": [int(x) for x in ds[col_l]],
                           "source": "training_data_pro_spam"})
        save("Email-Spam-fallback", df, "spam_emails_hf.csv")
    except Exception as e2:
        print(f"   ✗ Fallback also failed: {e2}")

# 5. Phishing URLs — shawhin/phishing-site-classification
try:
    print("5. Phishing URLs (shawhin/phishing-site-classification)...")
    ds = load_dataset("shawhin/phishing-site-classification", split="train")
    texts  = ds["url"]   if "url"   in ds.column_names else ds[ds.column_names[0]]
    labels_raw = ds["label"] if "label" in ds.column_names else ds[ds.column_names[-1]]
    df = pd.DataFrame({
        "text":   texts,
        "label":  [1 if str(l) in ("1", "phishing", "bad", "True") else 0
                   for l in labels_raw],
        "source": "phishing_urls_hf",
    })
    df = df[df["text"].astype(str).str.len() > 5]
    save("Phishing-URLs", df, "phishing_urls_hf.csv")
except Exception as e:
    print(f"   ✗ shawhin/phishing-site-classification: {e}")

# 6. Financial fraud descriptions
try:
    print("6. Financial fraud (berkaykis/financial_fraud_detection_dataset)...")
    ds = load_dataset("berkaykis/financial_fraud_detection_dataset", split="train")
    col_text  = ("transaction_description" if "transaction_description"
                 in ds.column_names else ds.column_names[0])
    col_label = "is_fraud" if "is_fraud" in ds.column_names else "label"
    df = pd.DataFrame({"text": ds[col_text],
                       "label": [int(x) for x in ds[col_label]],
                       "source": "financial_fraud_hf"})
    df = df[df["text"].astype(str).str.len() > 10]
    save("Financial-Fraud-HF", df, "financial_fraud_hf.csv")
except Exception as e:
    print(f"   ✗ berkaykis/financial_fraud: {e}")

print(f"\n✓ Done — check {OUTPUT}/")
print("\nFiles saved:")
for f in sorted(os.listdir(OUTPUT)):
    if f.endswith(".csv"):
        size = os.path.getsize(f"{OUTPUT}/{f}") // 1024
        print(f"  {f:<40} {size:>6} KB")
