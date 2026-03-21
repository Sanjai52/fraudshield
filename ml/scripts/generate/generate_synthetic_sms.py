"""
generate_synthetic_sms.py
--------------------------
Generates realistic synthetic Indian banking SMS messages.
    - Fraud messages (label=1) based on known real fraud patterns
    - Legitimate messages (label=0) based on real bank SMS formats

No internet needed. Runs instantly (~2 seconds).

Usage:
    cd fraudshield/
    source ml/venv/Scripts/activate
    python ml/scripts/scrape/generate_synthetic_sms.py
"""

import pandas as pd
import random
import os

OUTPUT = "ml/data/raw/indian-banking"
os.makedirs(OUTPUT, exist_ok=True)

random.seed(42)

# ── Source data ───────────────────────────────────────────────

BANKS = [
    "SBI", "HDFC", "ICICI", "Axis", "Kotak",
    "PNB", "BOB", "Canara", "Union Bank", "Paytm Bank",
]

FAKE_DOMAINS = [
    "sbi-kyc.net", "hdfc-secure.co", "icici-update.org",
    "sbi-verify.in", "hdfcbank-kyc.com", "sbi-block.net",
    "axis-secure.co", "bank-kyc-update.in", "sbi-kyc-update.net",
    "secure-hdfc.co", "icicisecure.net", "sbikyc.co.in",
    "hdfcbank-login.net", "icici-netbanking.co", "sbi-alert.in",
]

FAKE_SENDERS = [
    "SBI-ALERT", "SBI-KYC", "SBI-BLOCK", "HDFC-SECURE",
    "ICICI-KYC", "BANKALERT", "KYC-UPDATE", "BANKNOTIF",
    "AXIS-KYC", "KOTAK-KYC", "PNB-ALERT",
]

LEGIT_SENDERS = {
    "SBI": "SBIBNK", "HDFC": "HDFCBK", "ICICI": "ICICIB",
    "Axis": "AXISBK", "Kotak": "KOTAKB", "PNB": "PNBSMS",
    "BOB": "BOBANK", "Canara": "CNRBNK",
    "Union Bank": "UBIBNK", "Paytm Bank": "PAYTMB",
}

LEGIT_DOMAINS = {
    "SBI": "sbi.co.in", "HDFC": "hdfcbank.com", "ICICI": "icicibank.com",
    "Axis": "axisbank.com", "Kotak": "kotak.com", "PNB": "pnbindia.in",
    "BOB": "bankofbaroda.in", "Canara": "canarabank.com",
    "Union Bank": "unionbankofindia.co.in", "Paytm Bank": "paytmbank.com",
}

HELPLINES = {
    "SBI": "1800-11-2211", "HDFC": "1800-202-6161", "ICICI": "1800-1080",
    "Axis": "1800-419-5959", "Kotak": "1860-266-2666", "PNB": "1800-180-2222",
    "BOB": "1800-5700", "Canara": "1800-425-0018",
    "Union Bank": "1800-22-2244", "Paytm Bank": "0120-4456-456",
}

# ── Fraud templates (English) ─────────────────────────────────

FRAUD_EN = [
    "ALERT: Dear Customer, Your {bank} account has been BLOCKED due to incomplete KYC. Click {url} immediately or your account will be permanently suspended. -{sender}",
    "Dear {bank} customer, suspicious activity detected on your account. Verify at {url} within 24 hours to avoid suspension. -{sender}",
    "URGENT: Your {bank} account is suspended. Update KYC at {url} to reactivate. Failure results in permanent closure. -{sender}",
    "Your {bank} Net Banking has been blocked. Verify details at {url} to restore access immediately. -{sender}",
    "IMPORTANT: {bank} Bank requires Aadhaar re-verification. Visit {url} now. -{sender}",
    "Dear Customer, Your {bank} account closes in 24 hours if KYC not updated. Verify at {url}. -{sender}",
    "NOTICE: Unusual login on your {bank} account. Secure it at {url} or call {phone}. -{sender}",
    "{bank} Alert: Debit card blocked for security. Unblock at {url}. -{sender}",
    "FINAL WARNING: {bank} — incomplete documentation. Update at {url} before 6PM today. -{sender}",
    "Dear {bank} user, UPI ID suspended. Re-activate at {url} to continue. -{sender}",
    "SECURITY ALERT from {bank}: Someone tried to access your account. Confirm at {url}. -{sender}",
    "{bank}: PAN card mismatch found. Update at {url} to avoid account freeze. -{sender}",
    "Dear {bank} customer, password expires today. Reset at {url} to continue banking. -{sender}",
    "WARNING: {bank} will deactivate your account in 2 hours. Prevent at {url}. -{sender}",
    "Dear {bank} user, NEFT of Rs 49000 initiated. Not you? Cancel at {url} immediately. -{sender}",
    "Your {bank} account shows irregular activity. Immediate verification at {url}. -{sender}",
    "Congratulations! Your {bank} account selected for cashback. Claim at {url}. Limited time. -{sender}",
    "Your {bank} mobile number update requested. If not you, block at {url} immediately. -{sender}",
    "FINAL NOTICE: {bank} account linked PAN is unverified. Update at {url} today. -{sender}",
    "{bank} ALERT: Multiple failed login attempts. Secure your account at {url}. -{sender}",
]

# ── Fraud templates (Hindi) ───────────────────────────────────

FRAUD_HI = [
    "ALERT: {bank} grahak, aapka account band ho jayega. Abhi verify karein: {url} -{sender}",
    "Aapka {bank} account 24 ghante mein band ho jayega. KYC update karein: {url} -{sender}",
    "{bank} ALERT: Aapke account mein suspicious activity detect hui. {url} par verify karein. -{sender}",
    "Urgent: {bank} ne aapka UPI suspend kar diya. {url} par reactivate karein. -{sender}",
    "NOTICE: {bank} grahak, aapka Aadhaar link nahi hai. Aaj update karein: {url} -{sender}",
    "Dear {bank} user, aapka account block ho gaya. Turant {url} par jaayein. -{sender}",
    "CHETAVNI: Aapke {bank} account se anajaan transaction hua. {url} par check karein. -{sender}",
    "{bank}: Aapka debit card band ho gaya. Unblock ke liye {url} par click karein. -{sender}",
    "Aapka {bank} internet banking block ho gaya. Restore ke liye: {url} -{sender}",
    "IMPORTANT: {bank} KYC incomplete hai. Aaj complete karein: {url} Warna account freeze hoga. -{sender}",
    "{bank} Alert: Naya device login detect hua. Aap nahi hain toh {url} par block karein. -{sender}",
    "Priya {bank} grahak, aapke account se Rs 35000 transfer hone wala hai. Rokne ke liye: {url} -{sender}",
]

# ── Legitimate templates ──────────────────────────────────────

LEGIT_EN = [
    "{lsender}: INR {amt} debited from A/c XX{acct} on {date}. Avl Bal INR {bal}. If not done by you call {helpline}.",
    "{lsender}: INR {amt} credited to A/c XX{acct} on {date}. Avl Bal INR {bal}.",
    "Your {bank} OTP is {otp}. Valid for 10 mins. Do NOT share with anyone including bank officials.",
    "{lsender}: A/c XX{acct} debited INR {amt} for UPI txn on {date}. UPI Ref {ref}.",
    "{lsender}: Your {bank} credit card bill of INR {amt} is due on {date}. Pay at {ldomain}.",
    "{lsender}: Passbook A/c XX{acct} Bal INR {bal} as on {date}.",
    "{lsender}: {bank} FD of INR {amt} matures on {date}. Auto-renew unless cancelled.",
    "{lsender}: Loan EMI of INR {amt} due on {date}. Auto debit from A/c XX{acct}.",
    "{lsender}: Your {bank} NetBanking password changed on {date}. Not you? Call {helpline}.",
    "{lsender}: ATM txn INR {amt} on {date} from A/c XX{acct}. Bal INR {bal}.",
    "Dear {bank} customer, KYC is complete. No action required. Queries call {helpline}. -{lsender}",
    "{lsender}: INR {amt} transferred via UPI on {date}. Ref {ref}. Bal INR {bal}.",
    "{lsender}: Your {bank} Debit Card XX{acct} renewed. New card dispatched to registered address.",
]


def r_amt():   return f"{random.randint(200, 75000):,}"
def r_bal():   return f"{random.randint(500, 250000):,}"
def r_acct():  return str(random.randint(1000, 9999))
def r_otp():   return str(random.randint(100000, 999999))
def r_ref():   return f"UPI{random.randint(10**11, 10**12 - 1)}"
def r_date():  return f"{random.randint(1,28):02d}-{random.randint(1,12):02d}-26"
def r_phone(): return random.choice(["9876543210", "8765432109", "7654321098"])


rows = []

# English fraud — 700 messages
for _ in range(700):
    bank = random.choice(BANKS)
    rows.append({
        "text": random.choice(FRAUD_EN).format(
            bank=bank,
            url=random.choice(FAKE_DOMAINS),
            sender=random.choice(FAKE_SENDERS),
            phone=r_phone(),
        ),
        "label": 1,
        "source": "synthetic_fraud_en",
        "language": "en",
    })

# Hindi fraud — 350 messages
for _ in range(350):
    bank = random.choice(BANKS)
    rows.append({
        "text": random.choice(FRAUD_HI).format(
            bank=bank,
            url=random.choice(FAKE_DOMAINS),
            sender=random.choice(FAKE_SENDERS),
        ),
        "label": 1,
        "source": "synthetic_fraud_hi",
        "language": "hi",
    })

# Legitimate — 1500 messages
for _ in range(1500):
    bank = random.choice(list(LEGIT_SENDERS.keys()))
    rows.append({
        "text": random.choice(LEGIT_EN).format(
            bank=bank,
            lsender=LEGIT_SENDERS[bank],
            ldomain=LEGIT_DOMAINS[bank],
            helpline=HELPLINES[bank],
            amt=r_amt(), acct=r_acct(), bal=r_bal(),
            otp=r_otp(), ref=r_ref(), date=r_date(),
        ),
        "label": 0,
        "source": "synthetic_legitimate",
        "language": "en",
    })

df = pd.DataFrame(rows).sample(frac=1, random_state=42).reset_index(drop=True)
out = f"{OUTPUT}/synthetic_banking_sms.csv"
df.to_csv(out, index=False)

fraud = int(df["label"].sum())
legit = int((df["label"] == 0).sum())
print(f"✓ {len(df)} synthetic messages saved → {out}")
print(f"  English fraud : {len(df[(df.label==1) & (df.language=='en')])}")
print(f"  Hindi fraud   : {len(df[(df.label==1) & (df.language=='hi')])}")
print(f"  Legitimate    : {legit}")