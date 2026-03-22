"""
sender_ids.py
--------------
Sender ID verification engine.
Loads the curated bank sender ID database and checks whether
a given sender is verified, fake, or unknown.

Week 3: reads from JSON seed file directly.
Week 5: TODO — replace JSON load with Supabase query:
        supabase.table("sender_ids").select("*").execute()

Usage:
    from evidence.sender_ids import check_sender, get_bank_sender_ids
"""

from __future__ import annotations
import json
import os
import re
from typing import Optional

# Path to seed file — relative to this file's location
_SEED_PATH = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "..",
    "supabase", "seed", "sender_ids.json"
))

_db = None


def _load() -> dict:
    """Load sender ID database. Cached after first call."""
    global _db
    if _db is not None:
        return _db
    with open(_SEED_PATH, "r") as f:
        _db = json.load(f)
    return _db


def _extract_sender(text: str) -> Optional[str]:
    """
    Try to extract a sender ID from message text.
    SMS sender IDs typically appear at the start or after 'From:'.

    Examples:
        "SBIBNK: INR 500 debited..."      → "SBIBNK"
        "From SBI-ALERT: Your account..." → "SBI-ALERT"
        "SBI-KYC: Verify your account"    → "SBI-KYC"
    """
    text = text.strip()

    # Pattern 1: "SENDERNAME: rest of message"
    match = re.match(r'^([A-Z0-9\-]{4,15}):\s', text)
    if match:
        return match.group(1)

    # Pattern 2: "From SENDERNAME: rest of message"
    match = re.match(r'^From\s+([A-Z0-9\-]{4,15})[\s:,]', text, re.IGNORECASE)
    if match:
        return match.group(1)

    # Pattern 3: "-SENDERNAME" at end of message (common in SBI)
    match = re.search(r'-([A-Z0-9]{4,10})\s*$', text)
    if match:
        return match.group(1)

    return None


def check_sender(sender: str) -> dict:
    """
    Check a sender ID against the verified database.

    Args:
        sender: sender ID string e.g. "SBI-ALERT", "SBIBNK"

    Returns:
        {
            "sender":          str,
            "verified":        bool,
            "is_known_fake":   bool,
            "status":          "verified" | "known_fake" | "unknown",
            "claimed_bank":    str | None,
            "real_sender_ids": list[str],
            "helpline":        str | None,
            "official_domain": str | None,
            "source":          str | None,
        }
    """
    db     = _load()
    sender = sender.upper().strip()

    for bank in db["banks"]:
        # Check verified list
        if sender in [s.upper() for s in bank["sender_ids"]]:
            return {
                "sender":          sender,
                "verified":        True,
                "is_known_fake":   False,
                "status":          "verified",
                "claimed_bank":    bank["bank_name"],
                "real_sender_ids": bank["sender_ids"],
                "helpline":        bank["helpline"],
                "official_domain": bank["official_domain"],
                "source":          bank["source"],
            }

        # Check known fake patterns
        if sender in [f.upper() for f in bank["known_fake_patterns"]]:
            return {
                "sender":          sender,
                "verified":        False,
                "is_known_fake":   True,
                "status":          "known_fake",
                "claimed_bank":    bank["bank_name"],
                "real_sender_ids": bank["sender_ids"],
                "helpline":        bank["helpline"],
                "official_domain": bank["official_domain"],
                "source":          bank["source"],
            }

    # Partial match — sender contains a bank name but isn't in either list
    for bank in db["banks"]:
        short = bank["short_name"].upper()
        if short in sender:
            return {
                "sender":          sender,
                "verified":        False,
                "is_known_fake":   False,
                "status":          "unknown",
                "claimed_bank":    bank["bank_name"],
                "real_sender_ids": bank["sender_ids"],
                "helpline":        bank["helpline"],
                "official_domain": bank["official_domain"],
                "source":          bank["source"],
            }

    return {
        "sender":          sender,
        "verified":        False,
        "is_known_fake":   False,
        "status":          "unknown",
        "claimed_bank":    None,
        "real_sender_ids": [],
        "helpline":        db.get("national_fraud_helpline", "1930"),
        "official_domain": None,
        "source":          None,
    }


def check_sender_from_text(text: str) -> Optional[dict]:
    """
    Extract sender from message text and check it.
    Returns None if no sender ID found in the message.

    Called by text_pipeline.py automatically.
    """
    sender = _extract_sender(text)
    if not sender:
        return None
    return check_sender(sender)


def get_bank_sender_ids(bank_name: str) -> dict:
    """
    Get all verified sender IDs for a bank by name or short name.
    Used by GET /sender-ids/:bank endpoint.

    Args:
        bank_name: e.g. "SBI", "HDFC", "State Bank of India"
    """
    db         = _load()
    bank_upper = bank_name.upper().strip()

    for bank in db["banks"]:
        if (bank["short_name"].upper() == bank_upper or
                bank["bank_name"].upper() == bank_upper):
            return {
                "found":           True,
                "bank_name":       bank["bank_name"],
                "short_name":      bank["short_name"],
                "sender_ids":      bank["sender_ids"],
                "known_fakes":     bank["known_fake_patterns"],
                "helpline":        bank["helpline"],
                "official_domain": bank["official_domain"],
                "source":          bank["source"],
            }

    return {
        "found":      False,
        "bank_name":  bank_name,
        "sender_ids": [],
        "message":    (
            f"No verified sender IDs found for '{bank_name}'. "
            f"Supported: SBI, HDFC, ICICI, Axis, Kotak, "
            f"PNB, BOB, Canara, UBI, Paytm, RBI, NPCI"
        ),
    }
