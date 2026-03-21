"""
scrape_reddit_fraud_posts.py
-----------------------------
Scrapes public Reddit posts where Indians report banking fraud and scam SMS.
Uses Reddit's free public JSON API — no login, no API key needed.

After running:
    Open ml/data/raw/indian-banking/reddit_fraud_posts.csv in Excel.
    Read each row and set the label column:
        1  → contains actual fraud/scam message content
        0  → general complaint, not fraud content
        (delete row) → irrelevant
    Save the file. Then run prepare_combine_datasets.py.

Usage:
    cd fraudshield/
    source ml/venv/Scripts/activate
    python ml/scripts/scrape/scrape_reddit_fraud_posts.py
"""

import requests
import pandas as pd
import time
import os

OUTPUT = "ml/data/raw/indian-banking"
os.makedirs(OUTPUT, exist_ok=True)

HEADERS = {
    "User-Agent": "FraudShield-Academic-Research/1.0 (student fraud detection project)"
}

SUBREDDITS = [
    "india",
    "IndiaInvestments",
    "LegalAdviceIndia",
    "IndianStockMarket",
    "personalfinanceindia",
]

SEARCH_TERMS = [
    "fraud SMS",
    "phishing SMS",
    "scam message bank",
    "OTP fraud",
    "KYC fraud message",
    "UPI fraud SMS",
    "fake SBI message",
    "fake HDFC message",
    "fake ICICI message",
    "bank account blocked SMS",
    "verify account SMS scam",
]

collected = []
seen = set()


def fetch(subreddit: str, query: str) -> list:
    url = f"https://www.reddit.com/r/{subreddit}/search.json"
    params = {"q": query, "restrict_sr": 1, "sort": "relevance", "limit": 25, "t": "all"}
    try:
        r = requests.get(url, headers=HEADERS, params=params, timeout=15)
        if r.status_code == 200:
            return r.json().get("data", {}).get("children", [])
        if r.status_code == 429:
            print("    Rate limited — waiting 10s...")
            time.sleep(10)
    except Exception as e:
        print(f"    Error: {e}")
    return []


print("── Scraping Reddit India for fraud messages ──\n")

for sub in SUBREDDITS:
    for term in SEARCH_TERMS:
        print(f"  r/{sub} → '{term}'")
        for post in fetch(sub, term):
            d = post["data"]
            title = d.get("title", "").strip()
            body  = d.get("selftext", "").strip()
            body  = "" if body in ("[deleted]", "[removed]") else body
            text  = f"{title}\n{body}".strip()

            if len(text) < 30 or text in seen:
                continue

            seen.add(text)
            collected.append({
                "text":   text[:2000],
                "label":  -1,           # set to 0 or 1 manually in Excel
                "source": f"reddit_r_{sub}",
                "url":    f"https://reddit.com{d.get('permalink', '')}",
            })

        time.sleep(1.5)

df = pd.DataFrame(collected).drop_duplicates(subset=["text"])
out = f"{OUTPUT}/reddit_fraud_posts.csv"
df.to_csv(out, index=False)

print(f"\n✓ {len(df)} posts saved → {out}")
print()
print("Next step: open in Excel, set label = 1 (fraud) or 0 (legit) for each row.")
print("Takes ~60 minutes. Then run prepare_combine_datasets.py.")