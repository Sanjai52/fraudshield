"""
generate_synthetic_sms_v2.py
-----------------------------
Expanded synthetic Indian banking SMS generator.
Produces ~3,200 messages covering:
  - OTP scams, KYC fraud, UPI fraud, courier scams, job fraud  (label=1)
  - Real bank transactions, OTPs, bills, Airtel/Jio/BSNL       (label=0)
  - Hindi + Hinglish fraud patterns                             (label=1)

Run:
    cd fraudshield/
    python ml/scripts/generate/generate_synthetic_sms_v2.py

Output: ml/data/raw/indian-banking/synthetic_banking_sms.csv
        (OVERWRITES the old file — back up first if needed)
"""

import pandas as pd
import random
import os

OUTPUT = "ml/data/raw/indian-banking"
os.makedirs(OUTPUT, exist_ok=True)
random.seed(42)

# ── Helpers ───────────────────────────────────────────────────
BANKS = ["SBI", "HDFC", "ICICI", "Axis", "Kotak",
         "PNB", "BOB", "Canara", "Union Bank", "IndusInd", "Yes Bank"]

FAKE_DOMAINS = [
    "sbi-kyc.net", "hdfc-secure.co", "icici-update.org",
    "sbi-verify.in", "hdfcbank-kyc.com", "sbi-block.net",
    "axis-secure.co", "bank-kyc-update.in", "upi-reward.co",
    "fedex-india.net", "indiapost-customs.net", "parcel-india.co",
    "sbi-otp-verify.in", "hdfc-claim.net", "prizeindia.co",
    "work-earn-india.net", "jobfromhome.co.in", "google-offer.co",
]

FAKE_SENDERS = [
    "SBI-ALERT", "SBI-KYC", "HDFC-SECURE", "ICICI-KYC",
    "BANKALERT", "KYC-UPDATE", "AXIS-KYC", "UPI-REWARD",
    "FEDEX-IND", "INDIAPOST", "HR-JOBS",
]

LEGIT_SENDERS = {
    "SBI": "SBIBNK", "HDFC": "HDFCBK", "ICICI": "ICICIB",
    "Axis": "AXISBK", "Kotak": "KOTAKB", "PNB": "PNBSMS",
    "BOB": "BOBANK", "Canara": "CNRBNK",
    "Union Bank": "UBIBNK", "IndusInd": "INDBNK", "Yes Bank": "YESBNK",
}

LEGIT_DOMAINS = {
    "SBI": "sbi.co.in", "HDFC": "hdfcbank.com", "ICICI": "icicibank.com",
    "Axis": "axisbank.com", "Kotak": "kotak.com", "PNB": "pnbindia.in",
    "BOB": "bankofbaroda.in", "Canara": "canarabank.com",
    "Union Bank": "unionbankofindia.co.in",
    "IndusInd": "indusind.com", "Yes Bank": "yesbank.in",
}

HELPLINES = {
    "SBI": "1800-11-2211", "HDFC": "1800-202-6161", "ICICI": "1800-1080",
    "Axis": "1800-419-5959", "Kotak": "1860-266-2666", "PNB": "1800-180-2222",
    "BOB": "1800-5700", "Canara": "1800-425-0018",
    "Union Bank": "1800-22-2244", "IndusInd": "1860-500-5004",
    "Yes Bank": "1800-1200",
}

TELECOM = ["Airtel", "Jio", "BSNL", "Vi"]
TELECOM_DOMAINS = {"Airtel": "airtel.in", "Jio": "jio.com",
                   "BSNL": "bsnl.co.in", "Vi": "myvi.in"}

def r_amt():   return f"{random.randint(49, 99000):,}"
def r_bal():   return f"{random.randint(500, 300000):,.2f}"
def r_acct():  return str(random.randint(1000, 9999))
def r_otp():   return str(random.randint(100000, 999999))
def r_ref():   return f"UPI{random.randint(10**11, 10**12-1)}"
def r_date():  return f"{random.randint(1,28):02d}-{random.choice(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])}-26"
def r_phone(): return f"9{random.randint(10**8, 10**9-1)}"
def r_bill():  return f"{random.randint(199, 999)}"


# ── FRAUD templates ───────────────────────────────────────────

# 1. OTP Scams
FRAUD_OTP = [
    "Your {bank} OTP is {otp}. Share with our agent to unblock your account immediately. -{sender}",
    "ALERT: {bank} Account blocked. OTP {otp} sent to your number. Share it with helpdesk agent to restore access. -{sender}",
    "{bank} SECURITY: Your OTP is {otp}. Our executive will call you. Please share to verify your identity. -{sender}",
    "Dear customer, your {bank} account shows suspicious login. OTP {otp} — share with our fraud team on call now. -{sender}",
    "Important: {bank} KYC verification OTP: {otp}. Share this with agent calling you within 2 minutes. -{sender}",
    "Your {bank} UPI OTP is {otp}. Provide to bank representative to complete verification process. -{sender}",
    "{bank} Alert: OTP {otp} generated for account reactivation. Share immediately with bank officer. -{sender}",
]

# 2. KYC Fraud
FRAUD_KYC = [
    "Dear customer, your {bank} KYC is incomplete. Update at {url} immediately or account will be blocked. -{sender}",
    "URGENT: {bank} bank requires re-verification of your Aadhaar. Visit {url} now or lose access. -{sender}",
    "NOTICE: Your {bank} account will be suspended in 24 hours. Complete KYC at {url} to avoid suspension. -{sender}",
    "{bank}: PAN card mismatch detected. Update at {url} to avoid account freeze. Deadline: 6PM today. -{sender}",
    "Final Warning: {bank} account KYC overdue. Update immediately at {url} or face permanent closure. -{sender}",
    "Dear {bank} user, your account is at risk. Verify Aadhaar + PAN at {url} within 12 hours. -{sender}",
    "{bank} ALERT: Incomplete documentation. Verify at {url} before midnight to keep your account active. -{sender}",
    "As per RBI mandate, {bank} requires fresh KYC. Submit at {url} or your UPI will stop working. -{sender}",
    "Dear Customer, {bank} detected PAN not linked. Urgently update at {url} else account closes. -{sender}",
]

# 3. UPI / Reward Fraud
FRAUD_UPI = [
    "Congratulations! You have received Rs.{amt} from {bank} UPI reward program. Claim at {url} now. -{sender}",
    "You have received Rs.{amt} in your UPI wallet. Click {url} to transfer to bank account. Offer expires 2hrs. -{sender}",
    "{bank} UPI Cashback: Rs.{amt} approved for your account. Claim by entering UPI PIN at {url}. -{sender}",
    "HDFC UPI Reward: Rs.{amt} credited. To withdraw enter your UPI PIN at {url}. Valid 1 hour only. -{sender}",
    "{bank}: Festive bonus Rs.{amt} added to your UPI. Activate at {url} with your mPIN. -{sender}",
    "PM Jan Dhan: Rs.{amt} approved for your account. Collect by visiting {url} and entering Aadhaar. -{sender}",
    "GOV SCHEME: Rs.{amt} direct benefit transfer for {bank} customers. Claim at {url} today. -{sender}",
]

# 4. Courier / Customs Scam
FRAUD_COURIER = [
    "Your parcel is on hold at customs. Pay Rs.49 delivery fee at {url} to release. FEDEX India. -{sender}",
    "India Post: Your package (ID: IND{otp}) held at hub. Pay Rs.{amt} customs duty at {url} to release. -{sender}",
    "DHL Express: Shipment held. Outstanding customs fee Rs.99. Pay at {url} within 24 hrs or return to sender.",
    "Your Amazon order is held at customs. Rs.29 delivery surcharge pending. Pay at {url} to receive today. -{sender}",
    "DTDC: Parcel with tracking {otp} undelivered. Re-schedule delivery at {url} — fee Rs.49. -{sender}",
    "Blue Dart: Package held due to incomplete address. Confirm details & pay Rs.39 at {url}. -{sender}",
    "FedEx India: Package detained. Customs clearance fee Rs.149 pending. Pay at {url} to release shipment.",
]

# 5. Job Fraud
FRAUD_JOB = [
    "Work from home opportunity! Earn Rs.15,000/day. No experience needed. WhatsApp {phone}. Limited slots. -{sender}",
    "HIRING: Data entry job. Earn Rs.800 per hour working from home. Apply now: {url} -{sender}",
    "Earn Rs.50,000/month part time from home. Genuine opportunity. Register at {url} today. -{sender}",
    "Job Alert: {bank} requires home-based officers. Salary Rs.35,000/month. Apply at {url}. No experience. -{sender}",
    "Google hiring work-from-home agents. Rs.2,500/day. Registration at {url}. Hurry, 50 seats left! -{sender}",
    "Make Rs.10,000 daily liking YouTube videos. Training provided. Join via {url} or WhatsApp {phone}. -{sender}",
    "Amazon work-from-home: Earn Rs.1,200/hr reviewing products. Register free at {url}. -{sender}",
]

# 6. English KYC/general fraud (existing + more)
FRAUD_EN_EXTRA = [
    "SECURITY ALERT from {bank}: Someone tried accessing your account. Confirm identity at {url}. -{sender}",
    "Dear {bank} user, UPI ID suspended. Re-activate at {url} to continue transactions. -{sender}",
    "Your {bank} Net Banking blocked. Verify details at {url} to restore access immediately. -{sender}",
    "FINAL NOTICE: {bank} account linked PAN is unverified. Update at {url} today. -{sender}",
    "{bank} ALERT: Multiple failed login attempts on your account. Secure at {url}. -{sender}",
    "Congratulations! Your {bank} account selected for cashback Rs.{amt}. Claim at {url}. Limited time. -{sender}",
    "WARNING: {bank} will deactivate your account in 2 hours. Prevent closure at {url}. -{sender}",
    "Dear {bank} user, NEFT of Rs {amt} initiated. Not you? Cancel at {url} immediately. -{sender}",
    "{bank}: Debit card XX{acct} will expire soon. Renew at {url} to avoid disruption. -{sender}",
    "NOTICE: {bank} loan pre-approved Rs.5,00,000. No documents. Claim at {url}. -{sender}",
]

# 7. Hindi / Hinglish fraud
FRAUD_HI = [
    "ALERT: {bank} grahak, aapka account band ho jayega. Abhi verify karein: {url} -{sender}",
    "Aapka {bank} account 24 ghante mein band ho jayega. KYC update karein: {url} -{sender}",
    "{bank} ALERT: Aapke account mein suspicious activity detect hui. {url} par verify karein. -{sender}",
    "Urgent: {bank} ne aapka UPI suspend kar diya. {url} par reactivate karein. -{sender}",
    "NOTICE: {bank} grahak, aapka Aadhaar link nahi hai. Aaj update karein: {url} -{sender}",
    "CHETAVNI: Aapke {bank} account se anajaan transaction hua. {url} par check karein. -{sender}",
    "{bank}: Aapka debit card band ho gaya. Unblock ke liye {url} par click karein. -{sender}",
    "Priya {bank} grahak, Rs {amt} transfer hone wala hai. Rokne ke liye {url} par jaayein. -{sender}",
    "{bank} Alert: Naya device login detect hua. Aap nahi hain toh {url} par block karein. -{sender}",
    "Aapka OTP {otp} hai. Ise {bank} ke agent ke saath share karein account unlock karne ke liye. -{sender}",
    "Sarkari yojana: Aapke account mein Rs.{amt} bheje ja rahe hain. Link karein: {url} -{sender}",
    "Kamao Rs.15000 roz ghar baithe. Koi experience nahi chahiye. Register: {url} -{sender}",
    "Aapka parcel customs mein ruka hai. Rs.49 pay karein: {url} turant release ke liye. -{sender}",
    "Job offer: {bank} mein ghar se kaam karein. Rs.30,000/month. Apply:{url} WhatsApp:{phone}",
    "UPI reward: Aapko Rs.{amt} mila hai. Claim karne ke liye {url} par jaiyein. 1 ghante mein expire. -{sender}",
]


# ── LEGIT templates ────────────────────────────────────────────

LEGIT_BANK = [
    "{lsender}: INR {amt} debited from A/c XX{acct} on {date}. Avl Bal INR {bal}. If not done by you call {helpline}.",
    "{lsender}: INR {amt} credited to A/c XX{acct} on {date}. Avl Bal INR {bal}.",
    "Your {bank} OTP is {otp}. Valid for 10 mins. Do NOT share with anyone including bank officials.",
    "{lsender}: A/c XX{acct} debited INR {amt} for UPI txn on {date}. UPI Ref {ref}. Bal INR {bal}.",
    "{lsender}: Your {bank} credit card bill of INR {amt} is due on {date}. Pay at {ldomain}.",
    "{lsender}: Passbook A/c XX{acct} Bal INR {bal} as on {date}.",
    "{lsender}: {bank} FD of INR {amt} matures on {date}. Auto-renew unless cancelled via net banking.",
    "{lsender}: Loan EMI of INR {amt} due on {date}. Auto debit from A/c XX{acct}.",
    "{lsender}: Your {bank} NetBanking password changed on {date}. Not you? Call {helpline} immediately.",
    "{lsender}: ATM txn INR {amt} on {date} from A/c XX{acct}. Bal INR {bal}.",
    "Dear {bank} customer, KYC is complete. No action required. Queries call {helpline}. -{lsender}",
    "{lsender}: INR {amt} transferred via UPI on {date}. UPI Ref {ref}. Bal INR {bal}.",
    "{lsender}: Your {bank} Debit Card XX{acct} renewed. New card dispatched to registered address.",
    "INB:{bank} Rs.{amt} debited from A/c XX{acct} to VPA xyz@upi on {date}. Avl Bal Rs.{bal}",
    "{lsender}: NEFT of INR {amt} received in A/c XX{acct} on {date}. Avl Bal INR {bal}.",
    "{lsender}: Standing Instruction of INR {amt} executed on {date} from A/c XX{acct}.",
    "{lsender}: Your {bank} savings account interest of INR {amt} credited on {date}.",
    "{lsender}: Cheque No. {otp} of INR {amt} cleared from A/c XX{acct} on {date}.",
    "OTP for your {bank} Bank card transaction is {otp}. Valid for 10 mins. Do not share with anyone.",
    "{lsender}: Your {bank} account XX{acct} is now linked to UPI. Txn limit Rs.1,00,000/day.",
]

LEGIT_TELECOM = [
    "Dear customer, your {telecom} bill of Rs.{bill} is due on {date}. Pay now at {domain} to avoid disconnection.",
    "{telecom}: Your recharge of Rs.{bill} is successful. Validity: 28 days. Data: 1.5GB/day.",
    "Your {telecom} monthly bill of Rs.{bill} has been generated. Auto-pay on {date}. View at {domain}.",
    "{telecom}: Your data balance is 500MB. Recharge at {domain} to continue uninterrupted service.",
    "Thanks for paying your {telecom} bill of Rs.{bill}. Ref No: {otp}. Thank you for choosing {telecom}.",
    "{telecom}: Your postpaid plan activated. Monthly rental Rs.{bill}. Unlimited calls + 40GB data.",
    "Dear {telecom} customer, your number {phone} is verified. KYC complete. No further action needed.",
]

LEGIT_ECOMM = [
    "Your Amazon order #{otp} has been shipped. Expected delivery: {date}. Track at amazon.in/orders.",
    "Flipkart: Your order of Rs.{amt} is out for delivery. Delivery by {date}. Track: flipkart.com.",
    "Swiggy: Your order from Burger King is being prepared. Estimated delivery: 30 mins.",
    "Zomato: Your order #ORD{otp} confirmed. Arriving in 25-35 mins. Track in Zomato app.",
    "BigBasket: Your order of Rs.{amt} will be delivered on {date} between 6AM-10AM. No action needed.",
    "IRCTC: Ticket booked. PNR {otp}. Train departs {date}. Have a safe journey!",
    "MakeMyTrip: Flight booking confirmed. PNR {otp}. Departs {date}. Check-in 48hrs before.",
]


# ── Generate ───────────────────────────────────────────────────
rows = []

def add_fraud(templates, count, source, lang="en"):
    for _ in range(count):
        bank = random.choice(BANKS)
        tmpl = random.choice(templates)
        try:
            text = tmpl.format(
                bank=bank, url=random.choice(FAKE_DOMAINS),
                sender=random.choice(FAKE_SENDERS),
                otp=r_otp(), amt=r_amt(), acct=r_acct(),
                phone=r_phone(),
            )
        except KeyError:
            text = tmpl
        rows.append({"text": text, "label": 1, "source": source, "language": lang})

def add_legit_bank(count):
    for _ in range(count):
        bank = random.choice(list(LEGIT_SENDERS.keys()))
        tmpl = random.choice(LEGIT_BANK)
        text = tmpl.format(
            bank=bank, lsender=LEGIT_SENDERS[bank],
            ldomain=LEGIT_DOMAINS[bank], helpline=HELPLINES[bank],
            amt=r_amt(), acct=r_acct(), bal=r_bal(),
            otp=r_otp(), ref=r_ref(), date=r_date(),
        )
        rows.append({"text": text, "label": 0, "source": "synthetic_legit_bank", "language": "en"})

def add_legit_telecom(count):
    for _ in range(count):
        t = random.choice(TELECOM)
        tmpl = random.choice(LEGIT_TELECOM)
        text = tmpl.format(
            telecom=t, domain=TELECOM_DOMAINS[t],
            bill=r_bill(), date=r_date(),
            otp=r_otp(), phone=r_phone(),
        )
        rows.append({"text": text, "label": 0, "source": "synthetic_legit_telecom", "language": "en"})

def add_legit_ecomm(count):
    for _ in range(count):
        tmpl = random.choice(LEGIT_ECOMM)
        text = tmpl.format(amt=r_amt(), otp=r_otp(), date=r_date())
        rows.append({"text": text, "label": 0, "source": "synthetic_legit_ecomm", "language": "en"})


# FRAUD — 1,600 messages
add_fraud(FRAUD_OTP,       200, "synthetic_fraud_otp")
add_fraud(FRAUD_KYC,       250, "synthetic_fraud_kyc")
add_fraud(FRAUD_UPI,       200, "synthetic_fraud_upi")
add_fraud(FRAUD_COURIER,   150, "synthetic_fraud_courier")
add_fraud(FRAUD_JOB,       150, "synthetic_fraud_job")
add_fraud(FRAUD_EN_EXTRA,  250, "synthetic_fraud_en")
add_fraud(FRAUD_HI,        400, "synthetic_fraud_hi", "hi")

# LEGIT — 1,600 messages (balanced 1:1)
add_legit_bank(1000)
add_legit_telecom(350)
add_legit_ecomm(250)

df = pd.DataFrame(rows).sample(frac=1, random_state=42).reset_index(drop=True)
out = f"{OUTPUT}/synthetic_banking_sms.csv"
df.to_csv(out, index=False)

fraud_total = int(df["label"].sum())
legit_total = int((df["label"] == 0).sum())
print(f"✓ {len(df)} synthetic messages → {out}")
print(f"  Fraud : {fraud_total}  |  Legit : {legit_total}")
print()
print("Source breakdown:")
for src, cnt in df.groupby("source").size().sort_values(ascending=False).items():
    print(f"  {cnt:>5}  {src}")
