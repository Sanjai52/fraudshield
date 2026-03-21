"""
prepare_sender_id_database.py
------------------------------
Builds the curated bank sender ID database from official sources.
Output is seeded into Supabase on Phase 1 Day 1.

Run once — takes a few seconds.

Usage:
    cd fraudshield/
    source ml/venv/Scripts/activate
    python ml/scripts/prepare/prepare_sender_id_database.py
"""

import json
import os

OUT = "supabase/seed/sender_ids.json"
os.makedirs(os.path.dirname(OUT), exist_ok=True)

DATA = {
    "version": "1.0",
    "last_updated": "2026-03-01",
    "national_fraud_helpline": "1930",
    "notes": "Verified from official bank websites. Update manually when banks change sender IDs.",
    "banks": [
        {
            "bank_name": "State Bank of India",
            "short_name": "SBI",
            "official_domain": "sbi.co.in",
            "netbanking_url": "https://www.onlinesbi.sbi",
            "helpline": "1800-11-2211",
            "sender_ids": ["SBIBNK", "SBIPSG", "SBIATM", "SBIINB", "SBIMSG", "SBIB2B"],
            "known_fake_patterns": [
                "SBI-ALERT", "SBI-KYC", "SBI-BLOCK", "SBI-SECURE",
                "SBI-UPDATE", "SBIKYC", "SBI-VERIFY", "SBI-NOTICE",
            ],
            "source": "https://sbi.co.in/web/personal-banking/security-tips",
        },
        {
            "bank_name": "HDFC Bank",
            "short_name": "HDFC",
            "official_domain": "hdfcbank.com",
            "netbanking_url": "https://netbanking.hdfcbank.com",
            "helpline": "1800-202-6161",
            "sender_ids": ["HDFCBK", "HDFCBN", "HDFC", "HDFCEW", "HDFCRW"],
            "known_fake_patterns": [
                "HDFC-SECURE", "HDFC-KYC", "HDFC-BLOCK", "HDFCKYC",
                "HDFC-ALERT", "HDFC-VERIFY",
            ],
            "source": "https://www.hdfcbank.com/content/bbp/repositories/723fb80a",
        },
        {
            "bank_name": "ICICI Bank",
            "short_name": "ICICI",
            "official_domain": "icicibank.com",
            "netbanking_url": "https://infinity.icicibank.com",
            "helpline": "1800-1080",
            "sender_ids": ["ICICIB", "ICICI", "ICICIN", "ICICIP", "ICICIBANK"],
            "known_fake_patterns": [
                "ICICI-KYC", "ICICI-SECURE", "ICICI-BLOCK", "ICICIKYC",
                "ICICI-ALERT", "ICICI-VERIFY",
            ],
            "source": "https://www.icicibank.com/security/fraud-awareness",
        },
        {
            "bank_name": "Axis Bank",
            "short_name": "AXIS",
            "official_domain": "axisbank.com",
            "netbanking_url": "https://netbanking.axisbank.com",
            "helpline": "1800-419-5959",
            "sender_ids": ["AXISBK", "AXIS", "AXISBN", "AXISBANK"],
            "known_fake_patterns": [
                "AXIS-KYC", "AXIS-BLOCK", "AXIS-SECURE", "AXISKYC", "AXIS-ALERT",
            ],
            "source": "https://www.axisbank.com/about-us/security-tips",
        },
        {
            "bank_name": "Kotak Mahindra Bank",
            "short_name": "KOTAK",
            "official_domain": "kotak.com",
            "netbanking_url": "https://netbanking.kotak.com",
            "helpline": "1860-266-2666",
            "sender_ids": ["KOTAKB", "KOTAK", "KOTAKS", "KOTAKBANK"],
            "known_fake_patterns": [
                "KOTAK-KYC", "KOTAK-BLOCK", "KOTAKKYC", "KOTAK-ALERT",
            ],
            "source": "https://www.kotak.com/en/security-tips.html",
        },
        {
            "bank_name": "Punjab National Bank",
            "short_name": "PNB",
            "official_domain": "pnbindia.in",
            "netbanking_url": "https://netpnb.com",
            "helpline": "1800-180-2222",
            "sender_ids": ["PNBSMS", "PNB", "PNBALR", "PNBIND"],
            "known_fake_patterns": [
                "PNB-KYC", "PNB-ALERT", "PNB-BLOCK", "PNBKYC",
            ],
            "source": "https://www.pnbindia.in/security-tips.html",
        },
        {
            "bank_name": "Bank of Baroda",
            "short_name": "BOB",
            "official_domain": "bankofbaroda.in",
            "netbanking_url": "https://www.bobibanking.com",
            "helpline": "1800-5700",
            "sender_ids": ["BOBANK", "BOB", "BOBSMS", "BOBIND"],
            "known_fake_patterns": [
                "BOB-KYC", "BOB-ALERT", "BOBKYC", "BOB-BLOCK",
            ],
            "source": "https://www.bankofbaroda.in/security-tips.htm",
        },
        {
            "bank_name": "Canara Bank",
            "short_name": "CANARA",
            "official_domain": "canarabank.com",
            "netbanking_url": "https://canarabank.com/netbanking",
            "helpline": "1800-425-0018",
            "sender_ids": ["CNRBNK", "CANARA", "CANBK"],
            "known_fake_patterns": [
                "CANARA-KYC", "CANARA-BLOCK", "CANARAKYC",
            ],
            "source": "https://canarabank.com/security-awareness",
        },
        {
            "bank_name": "Union Bank of India",
            "short_name": "UBI",
            "official_domain": "unionbankofindia.co.in",
            "netbanking_url": "https://www.unionbankonline.co.in",
            "helpline": "1800-22-2244",
            "sender_ids": ["UBIBNK", "UNINON", "UBIIND"],
            "known_fake_patterns": [
                "UBI-KYC", "UBI-ALERT", "UBIKYC",
            ],
            "source": "https://www.unionbankofindia.co.in/english/security-tip.aspx",
        },
        {
            "bank_name": "Paytm Payments Bank",
            "short_name": "PAYTM",
            "official_domain": "paytmbank.com",
            "netbanking_url": "https://bank.paytm.com",
            "helpline": "0120-4456-456",
            "sender_ids": ["PAYTMB", "PYTMBNK", "PAYTM", "PTMBANK"],
            "known_fake_patterns": [
                "PAYTM-KYC", "PAYTM-BLOCK", "PAYTMKYC", "PAYTMALRT",
            ],
            "source": "https://paytmbank.com/security",
        },
        {
            "bank_name": "Reserve Bank of India",
            "short_name": "RBI",
            "official_domain": "rbi.org.in",
            "netbanking_url": "https://rbi.org.in",
            "helpline": "14440",
            "sender_ids": ["RBISAY", "RBI", "RBIIND"],
            "known_fake_patterns": [
                "RBI-ALERT", "RBI-KYC", "RBIKYC", "RBI-NOTICE", "RBI-URGENT",
            ],
            "source": "https://www.rbi.org.in/commonman/English/scripts/Notification.aspx",
        },
        {
            "bank_name": "NPCI / UPI",
            "short_name": "NPCI",
            "official_domain": "npci.org.in",
            "netbanking_url": "https://www.npci.org.in",
            "helpline": "1800-891-3333",
            "sender_ids": ["NPCIUP", "UPIIND", "NPCI", "BHIMUPI"],
            "known_fake_patterns": [
                "NPCI-ALERT", "UPI-BLOCK", "UPIKYC", "NPCIKYC", "UPI-VERIFY",
            ],
            "source": "https://www.npci.org.in/who-we-are/fraud-awareness",
        },
    ],
}

with open(OUT, "w") as f:
    json.dump(DATA, f, indent=2)

total_ids   = sum(len(b["sender_ids"])          for b in DATA["banks"])
total_fakes = sum(len(b["known_fake_patterns"]) for b in DATA["banks"])

print(f"✓ Sender ID database saved → {OUT}")
print(f"  Banks              : {len(DATA['banks'])}")
print(f"  Verified sender IDs: {total_ids}")
print(f"  Known fake patterns: {total_fakes}")
print(f"  National helpline  : {DATA['national_fraud_helpline']}")
print()
print("This file is seeded into Supabase on Phase 1 Day 1.")