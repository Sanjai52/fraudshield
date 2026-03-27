# FraudShield — Product Overview

AI-powered fraud detection platform that helps users identify whether an SMS, WhatsApp message, email, URL, screenshot, or voice note is a scam — before they act on it.

---

## Problem

Modern scams have evolved significantly:

- AI-generated phishing messages are grammatically perfect
- Fake domains look legitimate (e.g., `sbi-kyc.net`)
- Messages use urgency, fear, and authority tactics
- Users are tricked before any transaction happens

No existing tool deeply analyzes suspicious messages and clearly explains fraud — especially within WhatsApp and SMS.

---

## Target Users

### Primary Users (40–70 years)
- Use WhatsApp daily
- Limited technical knowledge
- Need a simple verdict and clear next action

### Secondary Users (22–38 years)
- Tech-savvy
- Help family members detect scams
- Want a detailed breakdown and shareable results

---

## What FraudShield Does

Analyzes suspicious content using NLP, URL intelligence, OCR, and voice analysis and returns:

- **Verdict** — SAFE / SUSPICIOUS / DANGEROUS
- **Confidence score** — how certain the model is
- **Explanation** — why the content is risky
- **Actionable advice** — what to do next

Unlike traditional tools, FraudShield focuses on message content and intent, not just sender reputation.

---

## Features

### AI Fraud Detection
- NLP-based classification (BERT / IndicBERT / MuRIL)
- Intent detection — threat, urgency, credential harvesting
- Explainable AI with highlighted suspicious words

### URL Analysis
- WHOIS domain age check
- Google Safe Browsing
- VirusTotal + PhishTank integration
- Sandbox preview with screenshot

### Screenshot Analysis
- OCR via Tesseract extracts text
- Same fraud detection pipeline applied

### Voice Analysis
- MFCC feature extraction
- Detects synthetic / deepfake voices

### Sender ID Verification
- Checks against official bank sender IDs
- Flags spoofed senders

### Campaign Detection
- Identifies repeated scam patterns
- Shows number of users affected

---

## Example Output

```
HIGH RISK — This is a scam.

- Sender "SBI-ALERT" is not registered to SBI
- Link leads to a fake login page
- Message uses urgency and credential harvesting
- 412 people reported this message

Do NOT act. Call SBI: 1800-11-2211
```

---

## Privacy

- No raw message text stored
- PII removed before processing
- Only anonymized feature data stored
- URLs cached temporarily (24 hours)
- Voice data processed in memory and deleted

---

## Phases

### Phase 1 — Website
- Paste or upload suspicious content
- Get full fraud analysis with explanation
- Save history and share results

### Phase 2 — WhatsApp Bot
- Forward suspicious messages directly
- Get instant fraud verdict
- No app installation required

---

## Success Metrics

- >90% accuracy
- <3% false positives
- <3s response time

---

## Risks

- False positives affecting legitimate messages
- Evolving fraud tactics outpacing the model
- Limited labeled datasets for Indian languages

---

## Future Scope

- More Indian language support
- Improved voice deepfake detection
- Real-time scam alerts

---