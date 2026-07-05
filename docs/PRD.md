# Product Requirements Document (PRD): FraudShield

## 1. Introduction
**Product Name**: FraudShield
**Tagline**: AI That Sees Through Scams.
**Objective**: To provide a production-grade AI fraud detection platform that protects everyday Indians from SMS, WhatsApp, email, URL-based, and voice scams in real time.

This document serves as the single source of truth for new engineers, product managers, and contributors onboarding onto the FraudShield platform. It details the problem, solution, architecture, and current roadmap.

---

## 2. Problem Statement
India loses over ₹10,000 crore annually to digital fraud. The attack surface has evolved:
- **Sophistication**: AI-generated, grammatically perfect messages have replaced obvious spelling mistakes.
- **Deception**: Fake domains mirror real banks (e.g., `sbi-kyc.net`).
- **Personalization**: Messages use leaked personal data instead of generic greetings.
- **Multi-channel**: Attacks span across WhatsApp, SMS, voice calls, and screenshots.

Existing tools often check URLs but fail to analyze **message intent** (urgency, fear, credential harvesting). They don't explain *why* something is a scam or tell users *what to do next*. 

---

## 3. Target Audience
### Primary Users (40–70 years)
- Use WhatsApp daily with limited technical knowledge.
- Need a simple, plain-language verdict (SAFE / SUSPICIOUS / DANGEROUS) and a clear next action.

### Secondary Users (22–38 years)
- Tech-savvy individuals who help family members detect and avoid scams.
- Want a detailed breakdown, confidence scores, and shareable result cards.

---

## 4. Product Vision & Value Proposition
FraudShield analyzes suspicious content across multiple modalities (text, URLs, images, voice) and returns:
1. **Verdict**: `SAFE` / `SUSPICIOUS` / `DANGEROUS`
2. **Confidence Score**: Model certainty percentage.
3. **Explanation**: Why the content was flagged (e.g., spoofed sender, fresh domain, phishing language).
4. **Actionable Advice**: Precise next steps (e.g., "Do not click. Call your bank at 1800-XXX-XXXX").

---

## 5. Core Features
1. **AI-Powered Text Analysis**: Uses a fine-tuned `google/muril-base-cased` model supporting 10 Indian languages. Detects intents like credential harvesting, urgency, and impersonation.
2. **Deep URL Intelligence**: Checks domain age (WHOIS), Google Safe Browsing, VirusTotal, PhishTank, and provides a sandbox screenshot preview.
3. **Screenshot & Image Analysis**: Uses Tesseract OCR to extract text from images/screenshots and runs it through the NLP pipeline.
4. **Voice & Deepfake Detection**: Uses MFCC feature extraction to detect synthetic/AI-generated voices and robocall patterns.
5. **Sender ID Verification**: Cross-references a curated database of official registered sender IDs (SBI, HDFC, TRAI, etc.) to flag spoofing.
6. **Campaign & Pattern Detection**: Crowd-sourced reporting identifies widespread scam campaigns circulating in real-time.

---

## 6. Technical Architecture & Stack
FraudShield is built on a microservices-inspired architecture designed for low latency and high accuracy.

### Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS (Vercel)
- **Middleware**: Node.js, Express.js (API Gateway)
- **AI Engine**: Python 3.10+, FastAPI, Uvicorn (Railway)
- **Machine Learning**: `google/muril-base-cased`, Tesseract OCR (v5), Librosa, scikit-learn
- **Database**: Supabase / PostgreSQL (Users, Reports, History)

### Component Breakdown
- `apps/web/`: The Next.js consumer-facing web application.
- `apps/bot/`: WhatsApp bot integration for seamless forwarding and analysis.
- `services/ai/`: The core Python FastAPI engine handling NLP, URL scanning, OCR, and audio processing.
- `services/api/`: Node.js middleware for rate limiting, auth, and routing.
- `ml/`: Data, training, and evaluation scripts for the fine-tuned models.

---

## 7. Data Flow
1. **Input**: User submits text, URL, image, or voice via Web App or WhatsApp Bot.
2. **Gateway**: Request hits Node.js middleware for auth and rate-limiting.
3. **AI Pipeline**: Request routed to the FastAPI AI Engine.
    - *Text*: Runs through MuRIL for intent + Sender ID check.
    - *URL*: Queries WHOIS, Safe Browsing, VirusTotal.
    - *Image*: Runs OCR, then routes to Text pipeline.
    - *Voice*: Runs MFCC extraction and deepfake classification.
4. **Verdict Engine**: Aggregates pipeline scores to generate Verdict, Confidence, Reasons, and Advice.
5. **Storage**: Anonymized metadata and campaign stats are stored in Supabase.
6. **Output**: Result delivered back to the user interface.

---

## 8. Privacy & Security Policies
- **Zero-Trust Storage**: No raw message text or PII is ever stored. Content is processed in memory and immediately discarded.
- **Anonymized Data**: Only anonymized feature vectors are retained for ML improvements.
- **Ephemeral Processing**: Voice data is processed entirely in memory; URLs have a 24-hour cache TTL.
- **Transport**: All API traffic is encrypted via HTTPS / TLS 1.3.

---

## 9. API Contracts (Key Endpoints)
The AI Engine exposes several key endpoints (Base: `http://localhost:8000` / `https://api.fraudshield.in`):
- `POST /analyse/text`: Analyze message/SMS/email.
- `POST /analyse/url`: Deep URL analysis.
- `POST /analyse/image`: OCR + analysis of screenshots.
- `POST /analyse/voice`: Deepfake voice detection.
- `GET /sender-ids/{bank}`: Fetch official sender IDs.
- `POST /report`: Submit a new scam to the community database.

*Full Swagger documentation available at `/docs` when the AI engine is running.*

---

## 10. Setup for New Engineers
### Prerequisites
- Python 3.10+, Node.js 18+, npm 9+

### Quick Start
1. **Clone & Env**: Set up `.env` files in `services/ai` and `apps/web` with API keys (Google Safe Browsing, VirusTotal, Supabase).
2. **Start AI Engine**:
   ```bash
   cd services/ai
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```
3. **Start Frontend**:
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

---

## 11. Roadmap
### ✅ What's Shipped (v1.0)
- Multilingual Text/SMS fraud analysis.
- Deep URL intelligence.
- Screenshot OCR & Voice deepfake detection.
- Web UI & WhatsApp Bot integration.
- Privacy-first architecture.

### 🔭 Future Scope
- Real-time scam alert push notifications.
- Browser extension for inline URL safety warnings.
- UPI / payment fraud pattern detection.
- Deeper support for regional Indian dialects.
- Partner API for fintech and banking integrations.
