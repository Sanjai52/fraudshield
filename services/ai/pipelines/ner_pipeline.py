"""
ner_pipeline.py
----------------
Named Entity Recognition pipeline.
Extracts structured entities from fraud messages:
  - Bank name (claimed institution)
  - Amount (money mentioned)
  - URLs (links in message)
  - Action demanded (verify, click, call)
  - Urgency markers (immediately, 24 hours)
  - Phone numbers

Uses regex + keyword matching in Week 7.
Full spaCy NER model integration in Week 9.

Usage:
    from models.ner_pipeline import extract_entities
"""

from __future__ import annotations
import re
from typing import List, Dict, Any


# ── Bank name detection ───────────────────────────────────────
BANK_PATTERNS = {
    "State Bank of India": ["sbi", "state bank", "onlinesbi"],
    "HDFC Bank":           ["hdfc", "hdfcbank"],
    "ICICI Bank":          ["icici", "icicibank"],
    "Axis Bank":           ["axis bank", "axisbank"],
    "Kotak Bank":          ["kotak"],
    "Punjab National Bank":["pnb", "punjab national"],
    "Bank of Baroda":      ["bob", "bank of baroda"],
    "Canara Bank":         ["canara"],
    "Union Bank":          ["union bank", "unionbank"],
    "Paytm Bank":          ["paytm"],
    "RBI":                 ["rbi", "reserve bank"],
    "NPCI / UPI":          ["npci", "upi", "bhim"],
}

# ── Action keywords ───────────────────────────────────────────
ACTIONS = {
    "verify_kyc":       ["verify kyc", "update kyc", "complete kyc", "kyc update", "kyc verification"],
    "click_link":       ["click here", "click the link", "visit", "go to", "open the link"],
    "call_number":      ["call us", "call now", "contact us", "helpline", "call immediately"],
    "enter_details":    ["enter your", "provide your", "share your", "input your"],
    "download_app":     ["download", "install", "apk"],
    "transfer_money":   ["transfer", "send money", "pay now", "deposit"],
}

# ── Urgency markers ───────────────────────────────────────────
URGENCY_MARKERS = [
    "immediately", "urgent", "urgently", "now", "today",
    "within 24 hours", "within 2 hours", "in 10 minutes",
    "last chance", "final warning", "account will be blocked",
    "account will be suspended", "permanent", "permanently",
    "abhi", "turant", "band ho jayega",
]


def extract_entities(text: str) -> Dict[str, Any]:
    """
    Extract named entities from message text.

    Returns:
        {
            "banks":          list of bank names mentioned,
            "amounts":        list of money amounts,
            "urls":           list of URLs,
            "phone_numbers":  list of phone numbers,
            "actions":        list of actions demanded,
            "urgency":        list of urgency markers found,
            "has_urgency":    bool,
            "claimed_bank":   str | None  (primary bank claimed),
        }
    """
    text_lower = text.lower()

    # ── Banks ────────────────────────────────────────────────
    found_banks = []
    for bank_name, patterns in BANK_PATTERNS.items():
        if any(p in text_lower for p in patterns):
            found_banks.append(bank_name)

    # ── Amounts ──────────────────────────────────────────────
    amounts = re.findall(
        r'(?:rs\.?|inr|₹)\s*[\d,]+(?:\.\d{1,2})?'
        r'|[\d,]+(?:\.\d{1,2})?\s*(?:rs\.?|inr|₹|rupees?|lakh|cr)',
        text_lower
    )
    amounts = [a.strip().upper() for a in amounts]

    # ── URLs ─────────────────────────────────────────────────
    urls = re.findall(
        r'https?://[^\s<>"\']+|www\.[^\s<>"\']+|[a-z0-9\-]+\.[a-z]{2,}(?:/[^\s]*)?',
        text_lower
    )
    urls = list(set(urls))

    # ── Phone numbers ────────────────────────────────────────
    phone_numbers = re.findall(r'\b[6-9]\d{9}\b|\b\d{10}\b|\b1[89]00[-\s]?\d{2,}[-\s]?\d{4,}\b', text)
    phone_numbers = list(set(phone_numbers))

    # ── Actions ──────────────────────────────────────────────
    found_actions = []
    for action_type, keywords in ACTIONS.items():
        if any(kw in text_lower for kw in keywords):
            found_actions.append(action_type)

    # ── Urgency ──────────────────────────────────────────────
    found_urgency = [u for u in URGENCY_MARKERS if u in text_lower]

    return {
        "banks":         found_banks,
        "amounts":       amounts,
        "urls":          urls[:5],               # cap at 5
        "phone_numbers": phone_numbers[:3],       # cap at 3
        "actions":       found_actions,
        "urgency":       found_urgency,
        "has_urgency":   len(found_urgency) > 0,
        "claimed_bank":  found_banks[0] if found_banks else None,
    }