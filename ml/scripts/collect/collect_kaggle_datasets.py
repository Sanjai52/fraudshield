"""
collect_kaggle_datasets.py
---------------------------
Downloads phishing and spam datasets from Kaggle.

One-time Kaggle setup:
    1. kaggle.com → avatar → Settings → API → Create New Token
    2. Move kaggle.json to C:/Users/<name>/.kaggle/kaggle.json
    3. Done — this script handles the rest

Usage:
    cd fraudshield/
    source ml/venv/Scripts/activate
    python ml/scripts/collect/collect_kaggle_datasets.py
"""

import subprocess
import zipfile
import os

OUTPUT = "ml/data/raw/kaggle"
os.makedirs(OUTPUT, exist_ok=True)


def download(slug: str, folder: str) -> bool:
    dest = f"{OUTPUT}/{folder}"
    os.makedirs(dest, exist_ok=True)

    print(f"  Downloading {slug}...")
    result = subprocess.run(
        ["kaggle", "datasets", "download", "-d", slug, "-p", dest],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"    ✗ Failed: {result.stderr.strip()}")
        return False

    # Unzip and remove the zip
    for f in os.listdir(dest):
        if f.endswith(".zip"):
            with zipfile.ZipFile(f"{dest}/{f}", "r") as z:
                z.extractall(dest)
            os.remove(f"{dest}/{f}")

    files = os.listdir(dest)
    print(f"    ✓ {folder}: {files}")
    return True


print("── Downloading Kaggle datasets ──")
print("   Requires kaggle.json in ~/.kaggle/\n")

DATASETS = [
    # (kaggle_slug,                                  local_folder)
    ("uciml/sms-spam-collection-dataset",            "uci_sms"),
    ("subhajournal/phishingemails",                  "phishing_emails"),
    ("naserabdullahalam/phishing-email-dataset",     "banking_phishing"),
    ("team-ai/spam-text-message-classification",     "sms_spam_team_ai"),
    ("murraystate/phishing-websites",                "phishing_websites"),
]

passed = sum(download(slug, folder) for slug, folder in DATASETS)
print(f"\n✓ {passed}/{len(DATASETS)} datasets downloaded → ml/data/raw/kaggle/")