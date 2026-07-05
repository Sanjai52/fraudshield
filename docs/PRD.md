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
- Tech-savvy individuals who help family members verify scams.
- Need detailed breakdowns, confidence scores, and shareable result cards to warn others.

---

## 4. Product Features & Requirements

### 4.1 Core Analysis Engine
- **Verdict Generation**: Output MUST classify content as `SAFE`, `SUSPICIOUS`, or `DANGEROUS`.
- **Explainability**: Must highlight suspicious phrases and provide a plain-language explanation of why the content is flagged.
- **Actionable Advice**: Must provide direct next steps (e.g., "Do not click. Call 1800-11-2211").

### 4.2 Multi-Modal Detection
- **Text & Intent Analysis**: NLP-based classification using a fine-tuned MuRIL model to catch urgency, credential harvesting, and impersonation across 10 Indian languages.
- **Deep URL Intelligence**: Checks domain age (WHOIS), Google Safe Browsing, VirusTotal, and PhishTank. Must fetch a sandbox preview screenshot.
- **Screenshot / Image OCR**: Uses Tesseract to extract text from forwarded WhatsApp images or fake invoices and runs it through the text pipeline.
- **Voice & Deepfake Detection**: Uses MFCC feature extraction to detect synthetic and AI-generated audio (robocalls/vishing).

### 4.3 Community & Campaign Tracking
- **Sender ID Verification**: Checks incoming senders against an official bank/government registry to flag spoofing.
- **Campaign Detection**: Groups similar scams and displays a live counter of how many users have reported the same message.

### 4.4 Interfaces
- **Web App**: Next.js-based web interface to paste or upload suspicious content, view results, and save history.
- **WhatsApp Bot**: An integration allowing users to forward messages directly to a bot and receive an instant verdict without installing an app.

---

## 5. Technical Architecture

FraudShield uses a modular, microservice-based architecture.

### 5.1 Tech Stack
- **Frontend / Web App**: Next.js 14, TypeScript, Tailwind CSS (Hosted on Vercel).
- **Middleware API**: Node.js & Express for rate-limiting, auth, and request routing.
- **AI Engine**: Python 3.10+, FastAPI (Hosted on Railway). Runs the MuRIL model (via HuggingFace) and ML pipelines.
- **Database**: Supabase (PostgreSQL) for user histories, campaign data, and sender ID registry.
- **Authentication**: Supabase Auth (sessions, magic links).

### 5.2 System Flow
1. User inputs text/image/URL/audio via the Web App or WhatsApp Bot.
2. The Request hits the Express Middleware for authentication and rate-limiting.
3. The request is routed to the Python AI Engine.
4. The Engine triggers the appropriate pipeline (Text, URL, Image, Voice) and applies Sender ID checks.
5. The Verdict Engine aggregates the scores and generates the explanation and advice.
6. The Database logs anonymized data to track scam campaigns.
7. The result is returned to the client in < 3 seconds.

---

## 6. Privacy & Security Principles
- **No Raw Text Stored**: The actual text content is analyzed in-memory and discarded.
- **PII Scrubbing**: Personally Identifiable Information is removed before processing.
- **Anonymization**: Only feature vectors are kept for ML training.
- **Ephemeral Audio**: Voice data is processed in-memory and never written to disk.
- **Short-Lived Caches**: URLs are cached for a maximum of 24 hours.

---

## 7. Metrics & KPIs
- **Accuracy**: > 90% detection accuracy.
- **False Positives**: < 3% to avoid blocking legitimate bank messages.
- **Latency**: Average response time of < 3.0 seconds.

---

## 8. Future Scope & Roadmap
- Implement real-time scam alert push notifications.
- Develop a browser extension for inline URL safety warnings.
- Expand detection for UPI and payment pattern fraud.
- Broaden support for more regional Indian dialects and scripts.
- Launch a Partner API for fintech and banking app integrations.
