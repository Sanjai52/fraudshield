# FraudShield — Product Requirements Document

**Version:** 1.0  
**Status:** Draft  
**Date:** March 2026  
**Team:** Student Project  
**Stack:** Next.js · Node.js · Express.js · Python · Supabase  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Target Users](#3-target-users)
4. [What We Are Building](#4-what-we-are-building)
5. [Phase 1 — Website](#5-phase-1--website)
6. [Phase 2 — WhatsApp Bot](#6-phase-2--whatsapp-bot)
7. [System Architecture](#7-system-architecture)
8. [Database Schema](#8-database-schema)
9. [API Endpoints](#9-api-endpoints)
10. [Build Sequence](#10-build-sequence)
11. [Success Metrics](#11-success-metrics)
12. [Risks](#12-risks)

---

## 1. Project Overview

FraudShield is a fraud detection tool that helps Indian banking customers identify whether an SMS, WhatsApp message, email, URL, screenshot, or voice note is a scam — **before they act on it.**

The user pastes or forwards a suspicious message. FraudShield analyses it using NLP and returns a verdict with evidence — not just a score, but a clear explanation of exactly what looks fraudulent and why.

### What makes it different from existing tools

| Tool | What it checks | What it misses |
|---|---|---|
| Truecaller | Phone number reputation | Message content entirely |
| Sanchar Saathi | SIM card fraud reports | Real-time content analysis |
| Google Messages | Basic keyword spam | Banking context, explanation |
| Bank fraud ML | Transaction patterns | The message before transaction |
| FraudShield | Message content + sender + URL + campaign | — |

---

## 2. Problem Statement

AI-generated phishing messages are now grammatically flawless. They use real bank logos, spoofed sender IDs, and personalized details scraped from data breaches. Old red flags — bad grammar, generic greetings — no longer exist.

**The gap:** No tool currently available to Indian citizens performs deep content analysis on a suspicious message, explains why it looks fraudulent, and works in the channel where fraud arrives — WhatsApp and SMS.

### How fraud typically works

```
Fraudster sends SMS pretending to be SBI
↓
"Your account is blocked. Verify KYC immediately: sbi-kyc.net/verify"
↓
User panics → clicks link → enters credentials → money gone
```

The intervention must happen **between receiving the message and clicking the link.**

---

## 3. Target Users

### Primary — Everyday citizen (Age 40–70)
- Uses WhatsApp daily, limited tech literacy
- Primary fraud target
- Will not download a new app
- Needs: WhatsApp bot, simple verdict in their language, one clear action step

### Secondary — Young professional (Age 22–38)
- Tech-savvy, helps family members understand fraud
- Needs: Full evidence breakdown on website, shareable result link

---

## 4. What We Are Building

### Two phases — same AI engine

**Phase 1 — Website** (Weeks 1–6)  
A Next.js web app where users paste/upload suspicious content and get a fraud verdict with full evidence.

**Phase 2 — WhatsApp Bot** (Weeks 7–10)  
The same AI engine delivered via WhatsApp. User forwards suspicious message to bot number, bot replies with verdict. Zero install required.

### What we are NOT building
- Bank API / B2B integration (out of scope for student project)
- Mobile app
- Browser extension

---

## 5. Phase 1 — Website

### 5.1 Pages

#### `/` — Landing Page
- Hero with inline text analyser — paste and check without signing in
- Live public stats: total messages checked, fraud detected this week
- Simple 3-step explainer: Paste → Analyse → Know
- Call to action: Sign up to save history

#### `/analyse` — Full Analyser Page
Four input tabs:

| Tab | Input | How it works |
|---|---|---|
| Text / SMS | Paste message text | Direct NLP analysis |
| URL | Paste suspicious link | Sandbox visit + domain check |
| Screenshot | Upload image | OCR extracts text → NLP analysis |
| Voice note | Upload audio file | MFCC features → deepfake classifier |

**Output panel for each analysis:**
- Verdict banner: 🚨 HIGH RISK / ⚠️ SUSPICIOUS / ✅ LOOKS SAFE
- Confidence score (e.g. 94%)
- Highlighted message — suspicious tokens colour-coded with hover explanation
- Signal cards — one card per detected fraud signal:
  - Fake sender ID
  - Urgency/threat language
  - Credential harvest attempt
  - Suspicious URL / domain mismatch
  - Campaign match
- Sender ID verification: "Sender SBI-ALERT is NOT registered to SBI. Real SBI sender IDs: SBIBNK, SBIPSG"
- URL sandbox screenshot (if URL present)
- Side-by-side: suspicious message vs real SBI message template
- Campaign count: "412 people reported this same message this week"
- Action step: "Do NOT act. Call SBI on 1800-11-2211"
- Share button → unique result URL

#### `/result/:id` — Shareable Result Page
- Public page, no login required to view
- Full evidence breakdown for that specific analysis
- User can share: "Look what FraudShield found about this message"
- WhatsApp bot includes link to this page in every reply

#### `/dashboard` — User Dashboard (Login Required)
- History of all analyses with verdicts and timestamps
- Saved reports
- Feedback history

#### `/transparency` — Public Accuracy Record
- Total messages analysed (live counter)
- Fraud correctly detected
- False positive rate (updated weekly)
- Top fraud patterns trending this week (anonymized)
- This page builds trust — it shows the system's track record openly

#### `/admin` — Admin Panel (Role-Protected)
- Review queue: messages awaiting human label (fraud / legitimate / unclear)
- Sender ID table editor
- False positive management

---

### 5.2 Authentication

| Feature | Detail |
|---|---|
| Guest access | 3 checks per day without login — result shown, not saved |
| Sign up / Login | Supabase Auth — Google OAuth + mobile OTP |
| Rate limiting | Per IP (guest) and per user (logged in) |
| Row-level security | Each user sees only their own history |
| Admin access | Role-based, 2FA required |

**Why OTP login matters:** Target users (elderly, rural) often don't have Google accounts. Mobile OTP is the only viable login method for them.

---

### 5.3 AI Engine — How it works

#### Text Analysis Pipeline

```
Input: raw message text
↓
Language detection (English / Hindi / Tamil / Telugu)
↓
Tokenization — BERT tokenizer splits message into subword tokens
↓
Contextual embeddings — each token gets a meaning vector
↓
Multi-head attention — transformer finds relationships between all tokens
↓
Named Entity Recognition (spaCy) — identifies BANK, URL, AMOUNT, ACTION, THREAT
↓
Intent classification — INFORM / WARN / THREATEN / HARVEST
↓
Fraud classifier — final verdict: HIGH_FRAUD / SUSPICIOUS / LEGITIMATE
↓
Attention weights extracted → mapped to tokens → plain language explanation
```

#### URL Analysis Pipeline

```
Input: URL
↓
WHOIS lookup — domain age, registrant country
↓
Google Safe Browsing API — known phishing check (free, 10k/day)
↓
VirusTotal API — 70+ engine scan (free, 4 req/min)
↓
PhishTank — crowd-verified phishing database (free)
↓
Playwright sandbox — headless browser visits URL in isolation
↓
DOM analysis — looks for login forms, password fields, fake bank branding
↓
Screenshot captured — visual evidence of what the URL loads
↓
Domain comparison: sbi-kyc.net vs sbi.co.in → MISMATCH
```

#### Screenshot Analysis

```
Input: image file
↓
Tesseract OCR extracts text from image
↓
Extracted text → same text analysis pipeline
```

#### Voice Note Analysis

```
Input: audio file (MP3, WAV, OGG)
↓
librosa loads audio, extracts waveform
↓
MFCC (Mel-frequency cepstral coefficients) — 40 coefficient vectors
↓
Spectral centroid, zero-crossing rate, chroma features extracted
↓
Binary classifier: Human vs Synthetic voice
↓
Verdict + confidence + key synthetic indicators
```

#### Sender ID Verification

FraudShield maintains a curated table of official bank sender IDs compiled from official bank websites. A mismatch is factual, verifiable evidence — not an algorithm's opinion.

Example seed data:

| Bank | Verified Sender IDs |
|---|---|
| State Bank of India | SBIBNK, SBIPSG, SBIATM, SBIINB |
| HDFC Bank | HDFCBK, HDFCBN, HDFC |
| ICICI Bank | ICICIB, ICICI, ICICIN |
| Axis Bank | AXISBK, AXIS |
| Paytm | PAYTMB, PYTMBNK |
| RBI | RBISAY, RBI |

#### Sample Output JSON

```json
{
  "verdict": "HIGH_FRAUD",
  "confidence": 0.94,
  "signals": ["fake_sender_id", "credential_harvest", "urgency_pressure", "domain_mismatch"],
  "highlighted_tokens": [
    {"token": "BLOCKED", "signal": "urgency", "weight": 0.89},
    {"token": "sbi-kyc.net", "signal": "domain_mismatch", "weight": 0.97},
    {"token": "immediately", "signal": "urgency", "weight": 0.76},
    {"token": "Verify", "signal": "credential_harvest", "weight": 0.88}
  ],
  "explanation": "Sender ID SBI-ALERT is not registered to SBI. The domain sbi-kyc.net was registered 3 days ago and is not owned by SBI. Message structure — threaten account, demand verification, redirect to external link — matches 94% of confirmed SBI phishing messages.",
  "action": "Do not act on this message. Call SBI directly on 1800-11-2211.",
  "sender_verified": false,
  "real_sender_ids": ["SBIBNK", "SBIPSG"],
  "campaign_reports": 412
}
```

---

### 5.4 Privacy Rules

- Raw message text is **never stored** in the database
- PII (names, account numbers, phone numbers) is stripped in Node.js middleware before any Python call
- Only feature vectors, verdict, and signals are stored — nothing reconstructable
- Voice audio is processed in memory and deleted immediately — only MFCC features retained
- URL hash stored (not raw URL), cached for 24 hours then deleted

---

## 6. Phase 2 — WhatsApp Bot

### 6.1 Why WhatsApp

Fraud arrives via SMS and WhatsApp. The defence must live there too.

- 500M+ users in India — already on every phone
- Zero install required — user just forwards a message
- Works for elderly users who will never visit a website
- Viral: one family member shares the bot number in family group → 40+ relatives protected instantly

### 6.2 What's new vs Phase 1

The bot adds exactly **2 files** of new code. Everything else is reused from Phase 1.

| Component | Phase 1 | Phase 2 |
|---|---|---|
| NLP fraud classifier | Built | Reused — same FastAPI call |
| URL sandbox | Built | Reused |
| Voice deepfake detection | Built | Reused |
| OCR pipeline | Built | Reused |
| Sender ID database | Built | Reused |
| Campaign fingerprint DB | Built | Reused |
| PII stripping | Built | Reused |
| New code | — | `webhook.js` + `formatter.js` |

### 6.3 What users can send to the bot

- **SMS** — copy and paste the suspicious text message
- **WhatsApp message** — forward directly to bot
- **Email content** — copy and paste
- **Suspicious URL** — paste any link
- **Screenshot** — send as image (OCR extracts text)
- **Voice note** — send recording of suspicious call

### 6.4 Bot conversation flow

**First-time user:**
```
Bot: Hi! I'm FraudShield. Forward me any suspicious message, SMS, link, 
     screenshot, or voice note and I'll tell you if it's a scam.
     
     Reply with your language: 1-English  2-Hindi  3-Tamil  4-Telugu
     
User: 1

Bot: Got it! Send me anything suspicious.
```

**Standard fraud check:**
```
User: [forwards suspicious SMS]

Bot: Checking your message... ⏳

Bot: 🚨 HIGH RISK — This is a scam.

• Sender "SBI-ALERT" is not registered to SBI (real: SBIBNK)
• Link opens a fake login page asking for your password
• 412 people reported this same message this week

Do NOT act. Call SBI fraud helpline: 1800-11-2211

Full evidence: fraudcheck.in/result/abc123

Was this helpful? Reply YES or NO
```

**Safe message:**
```
Bot: ✅ This looks legitimate.

• Sender SBIBNK is officially verified for SBI
• No links or credential requests
• Format matches genuine SBI transaction alerts

Still unsure? Call SBI on 1800-11-2211.
```

### 6.5 WhatsApp API

| Component | Choice |
|---|---|
| Gateway | Meta Cloud API (primary) / Twilio WhatsApp (backup) |
| Webhook receiver | Node.js + Express.js |
| Session management | Supabase — phone number → user_id |
| Rate limiting | 10 checks per phone number per day |
| Media download | WhatsApp API media endpoint (images + voice notes) |

### 6.6 Language Support

| Language | Phase |
|---|---|
| English | Phase 2 launch |
| Hindi | Phase 2 launch |
| Tamil | Phase 2 (partial) |
| Telugu | Phase 2 (partial) |

Model: `ai4bharat/indic-bert` or `bert-base-multilingual-cased`

---

## 7. System Architecture

### Core principle
Build the intelligence once in Python. Deploy it everywhere — website and WhatsApp bot — via the same FastAPI endpoints. No logic is ever rebuilt.

### Architecture diagram

```
User (website) ──┐
                 ├──→ Next.js frontend
                 │         ↓
User (WhatsApp) ─┘    Node.js / Express.js
                       (PII strip → rate limit → auth)
                              ↓
                    Python FastAPI AI Engine
                    ┌─────────────────────────┐
                    │ Text pipeline            │
                    │ URL pipeline             │
                    │ OCR pipeline             │
                    │ Voice pipeline           │
                    │ Sender ID verification   │
                    │ Campaign fingerprint     │
                    │ Explainability engine    │
                    └─────────────────────────┘
                              ↓
                         Supabase
                    (analyses, feedback,
                     sender_ids, campaigns)
```

### Tech stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js (React) | Website — all user-facing pages |
| Middleware | Node.js + Express.js | API gateway, PII stripping, rate limiting, WhatsApp webhook |
| AI Backend | Python + FastAPI | All fraud detection logic |
| Database | Supabase (PostgreSQL) | All persistent storage |
| Auth | Supabase Auth | Google OAuth + OTP login |
| NLP Model | HuggingFace IndicBERT / mBERT | Text fraud classification |
| NER | spaCy | Entity extraction (bank names, URLs, amounts) |
| Voice Analysis | librosa + MFCC | Deepfake voice detection |
| URL Sandbox | Playwright | Safe headless browser URL visit + screenshot |
| OCR | Tesseract | Screenshot text extraction |
| URL APIs | Google Safe Browsing + VirusTotal + PhishTank | URL reputation checks |
| WhatsApp | Meta Cloud API / Twilio | Bot message handling |
| Hosting | Vercel (Next.js) + Railway/Render (Python) | Free tiers for student project |

---

## 8. Database Schema

### `users`
Managed by Supabase Auth.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| email | text | Nullable (OTP users have phone, not email) |
| phone | text | Nullable |
| role | text | user / admin |
| locale | text | en / hi / ta / te |
| created_at | timestamp | — |

### `analyses`
One row per fraud check. **No raw message text stored.**

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Nullable for guest checks |
| input_type | text | text / url / image / voice |
| feature_vector_hash | text | Anonymized representation |
| verdict | text | HIGH_FRAUD / SUSPICIOUS / LEGITIMATE |
| confidence | float | 0.0 – 1.0 |
| signals | text[] | Array of signal tags |
| explanation | text | Plain language explanation |
| action | text | What the user should do |
| campaign_id | uuid | Nullable — if matched to campaign |
| created_at | timestamp | — |

### `feedback`
User corrections to verdicts — feeds the learning loop.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| analysis_id | uuid | FK to analyses |
| user_id | uuid | FK to users |
| user_says_correct | boolean | Did the user agree with verdict? |
| user_label | text | What the user thinks it is |
| reviewed_by | uuid | Admin who reviewed |
| reviewed_at | timestamp | — |

### `sender_ids`
Official bank sender ID table — admin managed.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| bank_name | text | e.g. "State Bank of India" |
| sender_id | text | e.g. "SBIBNK" |
| verified | boolean | — |
| source_url | text | Official source link |
| last_updated | timestamp | — |

### `campaigns`
Active fraud campaign tracking.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| fingerprint_hash | text | Anonymized pattern hash |
| first_seen | timestamp | — |
| last_seen | timestamp | — |
| report_count | integer | — |
| confirmed | boolean | Human-confirmed campaign |
| pattern_tags | text[] | e.g. ["fake_sender", "kyc_scam"] |

### `url_checks`
URL scan result cache — 24hr expiry.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| url_hash | text | SHA256 of URL — not raw URL |
| whois_age_days | integer | Domain age |
| virustotal_score | integer | Engines flagged / total |
| phishtank_hit | boolean | — |
| safebrowsing_hit | boolean | — |
| screenshot_path | text | Stored in Supabase Storage |
| verdict | text | — |
| created_at | timestamp | Deleted after 24 hours |

### `model_versions`
Training history for transparency page.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| version | text | e.g. "v1.2" |
| accuracy | float | — |
| false_positive_rate | float | — |
| training_size | integer | Number of examples |
| deployed_at | timestamp | — |

---

## 9. API Endpoints

### Python FastAPI (AI Engine)

| Method | Endpoint | Input | Returns |
|---|---|---|---|
| POST | `/analyse/text` | message, lang | verdict, signals, explanation, highlighted_tokens, sender_check, campaign_count |
| POST | `/analyse/url` | url | verdict, whois, virustotal, phishtank, safebrowsing, screenshot_url, domain_age |
| POST | `/analyse/image` | image file | OCR text → same as /analyse/text |
| POST | `/analyse/voice` | audio file | verdict, confidence, synthetic_indicators |
| POST | `/feedback` | analysis_id, correct, user_label | queued: true |
| POST | `/report` | feature_vector, input_type | campaign_id if matched |
| GET | `/sender-ids/:bank` | bank name | verified_sender_ids[], source_url |
| GET | `/stats/public` | — | total_checks, fraud_detected, false_positive_rate |
| GET | `/health` | — | status, model_version, uptime |

### Node.js Express (Middleware Gateway)

All requests from Next.js frontend pass through here first.

- PII stripping runs on every request before it reaches Python
- Rate limiting: 3/day guest, 20/day authenticated user
- Supabase auth token verification
- WhatsApp webhook handler (Phase 2)

---

## 10. Build Sequence

| Week | Focus | Deliverable |
|---|---|---|
| 1 | Data + model setup | Training dataset assembled, BERT fine-tuning pipeline, accuracy baseline |
| 2 | Python FastAPI skeleton | POST /analyse/text returning verdict + signals, running locally |
| 3 | Sender ID DB + URL analysis | Sender ID table built, SafeBrowsing + VirusTotal + WHOIS integrated |
| 4 | Next.js frontend — analyser | Landing page + /analyse page, calling Python API end-to-end |
| 5 | Supabase + auth | DB schema live, Supabase Auth working, analyses stored, rate limiting |
| 6 | Feedback + admin + transparency | Feedback flow, admin review queue, /transparency page with real stats |
| 7 | OCR + voice + URL screenshot | All 4 input types supported |
| 8 | WhatsApp webhook | Twilio/Meta webhook receiving messages, replying with verdict |
| 9 | Multilingual | Hindi bot replies, IndicBERT integrated, language detection |
| 10 | Hardening + accuracy review | False positive audit, retrain on collected feedback, performance tuning |

---

## 11. Success Metrics

| Metric | Phase 1 Target | Phase 2 Target |
|---|---|---|
| Fraud detection accuracy | >90% on test set | >93% on live data |
| False positive rate | <3% | <2% |
| Analysis response time | <3 seconds (text) | <3 seconds (WhatsApp) |
| Community reports collected | 500 in 6 weeks | 5,000 in 3 months |
| Languages supported | English | English + Hindi |
| User feedback response rate | >20% | >15% |

**North star metric:** Number of fraud attempts intercepted before the user acted.

---

## 12. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| High false positive rate damages trust | High | Human review queue, conservative thresholds, aggressive FP audit |
| Voice deepfake classifier needs large labelled dataset | High | Scope as "experimental" in Phase 1, collect data before committing to accuracy claims |
| WhatsApp API access expensive or slow to approve | Medium | Build website first — bot is additive. Twilio sandbox available for testing |
| Fraud evolves faster than model updates | Medium | Weekly fine-tuning cycle, community reports as early warning |
| Users fear their messages are stored | Medium | Clear privacy notice, PII stripping verifiable in code, no raw text stored |
| Sparse community reports early on — learning loop doesn't run | Low initially | Supplement with public phishing datasets until real data accumulates |

---

## Appendix — Folder Structure

```
fraudshield/
├── apps/
│   ├── web/                          # Next.js website
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── analyse/page.tsx      # Full analyser
│   │   │   ├── result/[id]/page.tsx  # Shareable result
│   │   │   ├── dashboard/page.tsx    # User history
│   │   │   ├── transparency/page.tsx # Public accuracy record
│   │   │   └── admin/page.tsx        # Admin panel
│   │   ├── components/
│   │   │   ├── Analyser.tsx
│   │   │   ├── EvidencePanel.tsx
│   │   │   ├── HighlightedMessage.tsx
│   │   │   ├── SignalCard.tsx
│   │   │   └── VerdictBanner.tsx
│   │   └── lib/
│   │       ├── api.ts
│   │       └── auth.ts
│   │
│   └── bot/                          # WhatsApp bot — Phase 2
│       ├── webhook.js                # Receives WhatsApp messages
│       └── formatter.js              # Formats verdict for WhatsApp
│
├── services/
│   ├── api/                          # Node.js + Express.js gateway
│   │   ├── routes/
│   │   │   ├── analyse.js
│   │   │   ├── feedback.js
│   │   │   └── stats.js
│   │   ├── middleware/
│   │   │   ├── piiStrip.js
│   │   │   ├── rateLimit.js
│   │   │   └── auth.js
│   │   └── index.js
│   │
│   └── ai/                           # Python FastAPI backend
│       ├── main.py
│       ├── models/
│       │   ├── bert_classifier.py
│       │   ├── ner_pipeline.py
│       │   └── mfcc_classifier.py
│       ├── pipelines/
│       │   ├── text_pipeline.py
│       │   ├── url_pipeline.py
│       │   ├── voice_pipeline.py
│       │   └── ocr_pipeline.py
│       ├── evidence/
│       │   ├── sender_ids.py
│       │   ├── campaign_db.py
│       │   └── url_checks.py
│       └── explainer/
│           └── attention_explainer.py
│
└── supabase/
    ├── migrations/
    │   ├── 001_initial_schema.sql
    │   └── 002_sender_ids.sql
    └── seed/
        ├── sender_ids.json
        └── test_messages.json
```

---

## Appendix — External Services

| Service | Purpose | Cost | How to get |
|---|---|---|---|
| Supabase | Database + Auth | Free tier | supabase.com |
| Google Safe Browsing API | URL phishing check | Free (10k/day) | Google Cloud Console |
| VirusTotal API | URL scan | Free (4 req/min) | virustotal.com |
| PhishTank API | Phishing URL database | Free | phishtank.com |
| Twilio WhatsApp | Bot gateway (testing) | Free sandbox | twilio.com |
| Meta Cloud API | Bot gateway (production) | Free up to 1k conversations/month | developers.facebook.com |
| Vercel | Next.js hosting | Free tier | vercel.com |
| Railway / Render | Python FastAPI hosting | Free tier | railway.app |
| HuggingFace | Pre-trained models | Free | huggingface.co |

---

*FraudShield PRD v1.0 — March 2026*
