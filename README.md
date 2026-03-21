# 🚨 FraudShield

**Detect scams before you click.**

FraudShield is an AI-powered fraud detection platform that helps users identify whether an SMS, WhatsApp message, email, URL, screenshot, or voice note is a scam — before they act on it.

---

## 📌 Overview

FraudShield analyzes suspicious content using NLP, URL intelligence, OCR, and voice analysis to provide:

- ✅ Clear verdict (SAFE / SUSPICIOUS / DANGEROUS)
- 📊 Confidence score
- 🔍 Detailed explanation (why it’s risky)
- 🚫 Actionable advice (what to do next)

Unlike traditional tools, FraudShield focuses on **message content + intent**, not just sender reputation.

---

## ❗ Problem

Modern scams have evolved:

- AI-generated phishing messages are grammatically perfect  
- Fake domains look legitimate (e.g., `sbi-kyc.net`)  
- Messages use urgency, fear, and authority tactics  
- Users are tricked before any transaction happens  

**Gap:** No tool deeply analyzes suspicious messages and clearly explains fraud — especially within WhatsApp and SMS.

---

## 🎯 Target Users

### 👴 Primary Users (40–70 years)
- Use WhatsApp daily  
- Limited technical knowledge  
- Need simple verdict + clear action  

### 👨‍💻 Secondary Users (22–38 years)
- Tech-savvy  
- Help family detect scams  
- Want detailed breakdown + shareable results  

---

## 🏗️ What We Are Building

### Phase 1 — Website
- Paste or upload suspicious content  
- Get full fraud analysis with explanation  
- Save history and share results  

### Phase 2 — WhatsApp Bot
- Forward suspicious messages directly  
- Get instant fraud verdict  
- No app installation required  

---

## 🔍 Features

### 🧠 AI Fraud Detection
- NLP-based classification (BERT / IndicBERT)  
- Intent detection (threat, urgency, credential harvesting)  
- Explainable AI with highlighted suspicious words  

### 🌐 URL Analysis
- WHOIS domain age check  
- Google Safe Browsing  
- VirusTotal + PhishTank integration  
- Sandbox preview with screenshot  

### 🖼️ Screenshot Analysis
- OCR (Tesseract) extracts text  
- Same fraud detection pipeline applied  

### 🎤 Voice Analysis
- MFCC feature extraction  
- Detects synthetic / deepfake voices  

### 🏦 Sender ID Verification
- Checks against official bank sender IDs  
- Flags spoofed senders  

### 📊 Campaign Detection
- Identifies repeated scam patterns  
- Shows number of users affected  

---

## 📱 Example Output

🚨 HIGH RISK — This is a scam.

• Sender "SBI-ALERT" is not registered to SBI  
• Link leads to a fake login page  
• Message uses urgency and credential harvesting  
• 412 people reported this message  

Do NOT act. Call SBI: 1800-11-2211

---

## 🔐 Privacy First

- ❌ No raw message text stored  
- 🔒 Personally identifiable information (PII) removed before processing  
- 📉 Only anonymized feature data stored  
- 🗑️ URLs cached temporarily (24 hours)  
- 🎤 Voice data processed in memory and deleted  

---

## 🧱 Tech Stack

Frontend: Next.js  
Backend: Node.js + Express.js  
AI Engine: Python + FastAPI  
Database: Supabase (PostgreSQL)  
NLP Models: HuggingFace (BERT / IndicBERT)  
OCR: Tesseract  
Voice: Librosa  
URL Sandbox: Playwright  

---

## 🏗️ Architecture

User → Frontend / Bot → Node.js Middleware → Python AI Engine → Database

---

## 📡 API Endpoints

- POST /analyse/text  
- POST /analyse/url  
- POST /analyse/image  
- POST /analyse/voice  
- POST /feedback  
- GET /stats/public  

---

## 📊 Success Metrics

- >90% accuracy  
- <3% false positives  
- <3s response time  

---

## ⚠️ Risks

- False positives  
- Evolving fraud tactics  
- Limited datasets  

---

## 🚀 Future Scope

- More languages  
- Better voice detection  
- Real-time alerts  

---

## 📂 Project Structure

fraudshield/
├── apps/
├── services/
└── supabase/

---

## 🌟 Vision

Stop scams before users lose money.

---

## 📅 Status

Student Project — 2026

---

## 📜 License

MIT License
