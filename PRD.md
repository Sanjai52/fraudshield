# FraudShield — Product Requirements Document

**Version:** 1.0 — Initial Release
**Status:** Draft — Architecture & Design Phase
**Date:** March 2026
**Classification:** Confidential
**Channels:** Website (Phase 1) → WhatsApp Bot (Phase 2) → Bank API (Phase 3)
**Tech Stack:** Next.js · Node.js · Express.js · Python · Supabase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Market Context](#2-problem-statement--market-context)
3. [Target Users & Goals](#3-target-users--goals)
4. [System Architecture](#4-system-architecture)
5. [Phase 1 — Website with Full Core Logic](#5-phase-1--website-with-full-core-logic)
6. [Phase 2 — WhatsApp Bot](#6-phase-2--whatsapp-bot)
7. [Phase 3 — Bank API & Institutional Integration](#7-phase-3--bank-api--institutional-integration)
8. [Trust Architecture](#8-trust-architecture)
9. [Unique Differentiators](#9-unique-differentiators)
10. [Data Strategy](#10-data-strategy)
11. [Recommended Build Sequence](#11-recommended-build-sequence)
12. [Success Metrics](#12-success-metrics)
13. [Risks & Mitigations](#13-risks--mitigations)
14. [Appendix](#14-appendix)

---

## 1. Executive Summary

FraudShield is an AI-powered fraud detection platform designed to protect banking customers in India from GenAI-generated fraud delivered via SMS, email, phone calls, and WhatsApp. Unlike existing tools that rely on keyword matching, blacklists, or phone number reputation alone, FraudShield performs deep linguistic analysis on message content — understanding intent, entity relationships, tone, and structural fraud patterns — and returns verifiable evidence rather than an opaque score.

The platform addresses a critical and completely unoccupied gap in India's fraud defence landscape: a citizen-facing, channel-agnostic, explanation-first detection system that works where fraud actually arrives — on the user's phone — before money is lost.

### 1.1 The Problem

AI-generated fraud has fundamentally changed the threat landscape. LLM-generated phishing messages are grammatically flawless, contextually personalized, and structurally indistinguishable from legitimate bank communication. Deepfake voice technology allows fraudsters to impersonate bank officers convincingly. Spoofed sender IDs bypass DLT-based filters. Despite awareness campaigns, fraud losses continue rising because:

- Panic and urgency override knowledge — users act before they think
- AI-generated fraud has eliminated old red flags — bad grammar, generic greetings
- Fraudsters use real personal data scraped from breaches — names, account last 4 digits, recent transactions
- The most vulnerable users — elderly, first-generation digital banking users — are specifically targeted
- UPI transactions complete in seconds — recovery after loss is nearly impossible

### 1.2 The Solution

FraudShield provides instant, explainable fraud analysis through two primary channels — a Next.js web application and a WhatsApp bot — both powered by the same Python AI backend. The system combines:

- Transformer-based NLP that reads intent and relationships, not keywords
- Verifiable evidence — sender ID verification, URL sandboxing, real bank message comparison
- Community-powered campaign detection — crowd reports become training signals
- Continuous learning — every confirmed case fine-tunes the model weekly
- Privacy-first architecture — PII stripped before processing, zero raw data stored
- Multilingual support — Hindi, Tamil, Telugu, and English from day one

### 1.3 Why This Is Different

> No existing tool — government, telecom, bank, or private — covers deep NLP content analysis, verifiable proof, WhatsApp-native delivery, multilingual support, and continuous learning simultaneously. That intersection is completely unoccupied. FraudShield owns it.

### 1.4 Deployment Strategy

Phase 1 builds the website — proving the model and accumulating real-world accuracy data. Phase 2 adds the WhatsApp bot, which reuses 95% of the Phase 1 codebase. Phase 3 exposes the engine as a bank-facing REST API. The same Python backend powers all three surfaces — no logic is ever rebuilt.

---

## 2. Problem Statement & Market Context

### 2.1 The Fraud Landscape in India

India is the world's fastest-growing digital payments market, with over 500 million WhatsApp users, 300 million UPI users, and 1 billion mobile banking customers. This scale makes it the highest-value target for AI-driven fraud globally.

| Fraud Channel | Attack Type | Primary Target | Current Defence Gap |
|---|---|---|---|
| SMS / WhatsApp | Smishing, fake OTP, sender spoofing | All demographics | No content analysis at network level |
| Phone calls | Vishing, deepfake voice cloning | Elderly, rural users | No deepfake detection for citizens |
| Email | AI-written spear phishing | Professionals, staff | Generic spam filters, no banking context |
| URLs in messages | Pharming, credential harvesting | All demographics | Blacklists miss new domains entirely |
| Voice notes | AI-generated bank officer voice | High-value customers | No tool exists for this channel |

### 2.2 Why Awareness Campaigns Fail

Campaigns are built on a flawed premise — that fraud succeeds because users do not know better. The reality is:

- Panic overrides knowledge — "your account is blocked in 10 minutes" bypasses rational thinking even in aware users
- AI fraud is now indistinguishable — flawless grammar, real logos, spoofed sender IDs, personalized details from breaches
- The most targeted users are hardest to reach — elderly and first-gen digital users do not attend webinars
- Transaction window is too short — UPI transfers complete in seconds, recovery is nearly impossible

> The intervention must happen before the message reaches the person, or at the moment of the suspicious communication — not after money is lost. That is what FraudShield does.

### 2.3 Competitive Landscape — Critical Gaps

| Tool | Type | Content Analysis | WhatsApp Native | Multilingual | Explains Why | Pre-Fraud |
|---|---|---|---|---|---|---|
| Sanchar Saathi | Government | ✕ None | ✕ No | ✕ No | ✕ No | ✕ Reporting only |
| TRAI DLT / FRI | Government | ✕ Number only | ✕ No | ✕ No | ✕ No | ~ Transaction layer |
| Truecaller | Private | ✕ Number only | ✕ No | ~ Partial | ✕ No | ✓ Caller warning |
| Google Messages | Tech | ~ Basic spam | ✕ No | ~ Partial | ✕ No | ✓ Auto-filter |
| Bank fraud ML | Banking | ✕ Transaction | ✕ No | ✕ No | ✕ No | ✕ Post-transaction |
| ChatGPT | AI | ✓ Strong | ✕ No | ~ Partial | ✓ Yes | ✓ If prompted |
| **FraudShield** | **Our System** | **✓ Deep NLP** | **✓ Yes** | **✓ Yes** | **✓ Full** | **✓ Yes** |

### 2.4 Government Initiatives — What Exists and What Is Missing

**Sanchar Saathi (DoT/TRAI)** — India's primary citizen fraud reporting platform. Has disconnected over 2.8 crore SIM cards linked to fraud. However: reporting only, no real-time verdict, no message content analysis, not multilingual, complex UI not usable by elderly.

**Financial Fraud Risk Indicator (FRI) — DoT DIP** — Launched May 2025. Classifies mobile numbers as Medium/High/Very High fraud risk. RBI mandated all 1000+ banks integrate by June 2025. Already prevented ₹660 crore in fraud losses. However: number risk only, not citizen-facing, no message analysis, no WhatsApp capability, blind to the communication layer where fraud is engineered.

**The gap FraudShield fills:** The government has built powerful backend intelligence. Banks are being mandated to integrate it. But the citizen-facing layer — the tool that protects a person before they initiate a transaction — remains completely unbuilt.

---

## 3. Target Users & Goals

### 3.1 Primary User Segments

#### Segment 1 — Everyday Citizen
- Age 40–70, mobile-first, uses WhatsApp daily
- Limited tech literacy, primary fraud target
- Will not download a new app
- **Needs:** WhatsApp bot, simple verdict in their language, one clear action step, no technical jargon

#### Segment 2 — Young Professional
- Age 22–38, tech-savvy, wants full explanation
- Helps family members, spreads awareness
- **Needs:** Website with full evidence breakdown, shareable result link, detailed signal analysis

#### Segment 3 — Bank / Org Staff
- Fraud analysts, customer support, IT security teams
- **Needs:** REST API for integration, admin dashboard, bulk message scanning, campaign intelligence

#### Segment 4 — Admin / Analyst
- Internal team managing model and review queue
- **Needs:** Review queue with labelling tools, model accuracy metrics, retraining controls, sender ID management

### 3.2 User Goals vs System Goals

| User Type | Their Goal | System Goal | Success Metric |
|---|---|---|---|
| Everyday citizen | Know if this message is safe before acting | Intercept fraud before money moves | Fraud stopped before transaction |
| Young professional | Understand the full evidence | Build long-term trust through transparency | Result shared with 3+ family members |
| Bank staff | Detect fraud patterns at scale | Generate institutional revenue | Bank API integration signed |
| Admin | Keep model accurate and improving | Reduce false positive rate continuously | FP rate under 2%, improving weekly |

---

## 4. System Architecture

### 4.1 Core Architectural Principle

> Build the intelligence once — in the Python backend. Deploy it everywhere — website, WhatsApp bot, bank API. No logic is ever rebuilt. Every new channel adds only a thin adapter layer on top of the same engine.

### 4.2 Architecture Layers

#### Layer 0 — Input Channels
All input types — text, image screenshot, URL, voice note — are accepted by both the website (browser upload) and the WhatsApp bot (forwarded messages). Each input type is routed to the appropriate pre-processing pipeline before reaching the AI engine.

#### Layer 1 — Privacy Gate
Before any content reaches the AI engine or database, PII is stripped. Names, account numbers, phone numbers, and any personally identifiable information are removed. Only anonymized feature signals are retained. Raw message content is never stored anywhere in the system.

#### Layer 2 — Pre-Processing Pipeline
- **Text input:** language detection, normalization, tokenization
- **Image input:** Tesseract OCR extracts text, then runs text pipeline
- **URL input:** Playwright headless browser visits safely in sandbox, captures DOM and screenshot
- **Voice input:** librosa MFCC feature extraction, prepared for deepfake classifier

#### Layer 3 — AI Understanding Engine (Python FastAPI)
The core intelligence. Six sequential stages:

1. **Tokenization** — message split into subword tokens via BERT tokenizer
2. **Embeddings** — each token mapped to a meaning vector in context
3. **Attention** — every token examines every other token, finding relationships
4. **Named Entity Recognition** — banks, URLs, amounts, actions identified via spaCy
5. **Intent classification** — overall message goal classified: INFORM / WARN / THREATEN / HARVEST
6. **Fraud classifier** — fine-tuned transformer makes final judgment across all signals

#### Layer 4 — Evidence Engine
- **Sender ID check** — verified against curated bank sender ID database sourced from official bank websites
- **URL sandbox** — Playwright visits link in isolation, screenshots what it loads, checks DOM for credential harvesting
- **Domain WHOIS** — registration age, registrant country, domain structure analysis
- **Google Safe Browsing API** — free tier URL reputation check
- **VirusTotal API** — 70+ engine scan on suspicious URLs
- **PhishTank API** — crowd-verified phishing URL database lookup
- **Campaign fingerprint** — anonymized message hash matched against community report database
- **Real bank message comparison** — suspicious message compared against curated genuine bank SMS templates

#### Layer 5 — Explainability Engine
Attention weights from the transformer are extracted and mapped to specific tokens in the original message. The system constructs a plain-language case: which tokens drove the verdict, what patterns they match, what percentage of confirmed fraud cases in training data showed this pattern. The output is a reasoned case, not a score.

#### Layer 6 — Continuous Learning Loop
- User reports community fraud → PII stripped → stored as candidate training signal
- Human analyst reviews candidate → confirms or rejects fraud label
- Confirmed cases join labelled dataset
- Weekly incremental fine-tuning cycle updates model on new verified examples
- Model version logged with accuracy metrics before deployment
- False positives corrected via feedback → user marks verdict wrong → admin reviews → correct label enters training

### 4.3 Tech Stack

| Layer | Technology | Purpose | Why This Choice |
|---|---|---|---|
| Frontend | Next.js (React) | Website — all user-facing pages | SSR for fast load, API routes for backend calls, single codebase for web and admin |
| Middleware | Node.js + Express.js | API gateway, webhook handler, auth middleware | Handles WhatsApp webhooks, rate limiting, PII stripping before Python call |
| AI Backend | Python + FastAPI | All fraud detection logic | HuggingFace, spaCy, librosa, Playwright all Python-native |
| Database | Supabase (PostgreSQL) | All persistent data storage | Full SQL for fraud analytics, RLS for user isolation, self-host option for compliance |
| Auth | Supabase Auth | User authentication | Built-in OTP login — critical for users without Google accounts |
| NLP Model | HuggingFace BERT / IndicBERT | Text fraud classification | Fine-tunable, runs locally — no data sent to external services |
| NER | spaCy | Entity extraction | Fast, accurate, multilingual models available |
| Voice Analysis | librosa + MFCC | Deepfake voice detection | Industry standard for audio feature extraction |
| URL Sandbox | Playwright | Safe URL visiting and analysis | Headless browser, full DOM access, screenshot capability |
| OCR | Tesseract | Screenshot text extraction | Open source, multilingual, no external API needed |
| URL Reputation | Google Safe Browsing + VirusTotal + PhishTank | URL verification | Free tiers sufficient for prototype, verifiable external sources |
| WhatsApp | Twilio / Meta Cloud API | Bot message handling | Official WhatsApp Business API — compliant, scalable |
| Hosting | Vercel (Next.js) + Railway/Render (Python) | Deployment | Free tiers available for student project, scale later |

---

## 5. Phase 1 — Website with Full Core Logic

**Timeline:** Weeks 1–6
**Goal:** Prove the AI model works on real fraud cases. Build the complete detection engine. Generate accuracy data that earns trust from banks and regulators.

### 5.1 Pages & Routes

#### `/` — Landing Page
- Hero section with inline analyser — paste and check without signing in
- Live public stats — total messages analysed, fraud detected this week, false positive rate
- How it works — 3-step explainer with examples
- Trust signals — accuracy dashboard link, open methodology, no data stored badge
- Call to action — sign up to save history, share bot number with family

#### `/analyse` — Full Analyser Page
- Four input tabs: Text / SMS, URL check, Screenshot upload, Voice note upload
- Full evidence breakdown panel:
  - Highlighted message with colour-coded suspicious tokens
  - Signal cards for each fraud dimension (urgency, credential harvest, sender mismatch, domain mismatch)
  - Real bank message comparison side by side
  - Sender ID verification result with official source link
  - URL sandbox screenshot if applicable
  - Campaign report count — "412 people reported this message this week"
- Shareable result — unique URL per analysis (`/result/abc123`) that anyone can open
- Feedback button — "Is this correct?" Yes / No, feeds learning loop
- Report button — confirm this is fraud, adds to community campaign database

#### `/result/:id` — Shareable Result Page
- Public page — no login required to view
- Full evidence breakdown for that specific analysis
- User shares with family: "Look what the system found about this message"
- WhatsApp bot includes link to this page in every reply

#### `/dashboard` — User Dashboard (Auth Required)
- History of all analyses with verdicts, timestamps, input type
- Saved reports — messages flagged for follow-up
- Feedback history — corrections submitted, review status
- Notifications — "A message you checked last week has now been confirmed as part of an active campaign by 400 other users"

#### `/transparency` — Public Accuracy Record
- Total messages analysed — updated live
- Fraud correctly detected — confirmed cases
- False positive rate — updated weekly after human review
- Model version history — accuracy improvements over time
- Top fraud patterns trending this week — anonymized
- **This page is not optional — it is the primary trust mechanism**

#### `/admin` — Admin Panel (Role-Protected)
- Review queue — messages awaiting human label (fraud / legitimate / unclear)
- Campaign intelligence map — active fraud campaigns by sender ID, domain, message fingerprint
- Model management — current version accuracy, retrain trigger, training dataset size
- Sender ID table editor — add, update, verify bank sender IDs with source URL
- False positive management — review user-reported incorrect verdicts

### 5.2 Authentication & Security

| Feature | Implementation | Reason |
|---|---|---|
| Guest analysis | 3 checks per day without login — results shown, not saved | Zero barrier for first-time users |
| Sign up / Login | Supabase Auth — Google OAuth + mobile OTP | OTP login critical — target users may not have Google accounts |
| Rate limiting | Express.js middleware — per IP (guest) and per user (logged in) | Prevents model extraction attacks |
| Row-level security | Supabase RLS policies — each user sees only their own data | Users cannot access each other's history |
| Admin protection | Role-based access + 2FA required | Admin panel strictly controlled |
| PII stripping | Node.js middleware strips PII before any Python backend call | Raw message content never reaches database |
| Anonymous mode | Analyse without account — no session, no storage, no tracking | For privacy-conscious users |

**Why auth is critical for this project specifically:**

Without auth → Anyone scrapes the model → Fraudsters learn to bypass it → System becomes useless

With auth + rate limit → Abuse is throttled → Model stays protected → Trust maintained

### 5.3 Core AI Engine — Detailed Specification

#### Text Analysis Pipeline

**Input:** raw message text (SMS, email body, WhatsApp message)

**Process:**
1. Language detection — `langdetect` library identifies language, routes to language-appropriate model
2. Tokenization — BERT tokenizer splits into subword tokens, preserving semantic units
3. Contextual embedding — each token gets a vector encoding its meaning in context of surrounding tokens
4. Multi-head attention — transformer layers identify relationships between all token pairs simultaneously
5. Named Entity Recognition — spaCy identifies: BANK, URL, AMOUNT, ACTION, THREAT entities
6. Intent classifier — classifies overall message intent: INFORM / WARN / THREATEN / HARVEST / UNKNOWN
7. Fraud classifier — final classification head trained on confirmed fraud vs legitimate banking messages

**Output JSON:**
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
  "explanation": "This message claims to be from SBI but the sender ID is not registered to SBI. The link leads to a domain registered 3 days ago not owned by SBI. The message structure — threaten account, demand verification, redirect to external link — matches 94% of confirmed SBI phishing messages in training data.",
  "action": "Do not act on this message. Call SBI directly on 1800-11-2211.",
  "sender_verified": false,
  "real_sender_ids": ["SBIBNK", "SBIPSG"],
  "campaign_reports": 412
}
```

#### URL Analysis Pipeline
1. Extract URL from text
2. WHOIS lookup — domain age, registrant, country
3. Google Safe Browsing API — check against known phishing database
4. VirusTotal API — 70+ engine scan
5. PhishTank — crowd-verified phishing database
6. Playwright sandbox visit — headless browser loads URL in isolation
7. DOM analysis — check for login forms, password fields, bank branding on non-bank domain
8. Screenshot capture — visual evidence of what the URL loads
9. Compare domain to official bank domain (e.g. `sbi-kyc.net` vs `sbi.co.in`)

#### Sender ID Verification
FraudShield maintains a curated database of official bank sender IDs compiled from official bank websites, RBI guidelines, and NPCI documentation. A mismatch is verifiable, government-source-backed evidence — not an algorithm's opinion.

#### Voice Deepfake Detection
1. Accept audio file (MP3, WAV, OGG — common WhatsApp voice note formats)
2. Load with librosa — extract waveform
3. Compute MFCC (Mel-frequency cepstral coefficients) — 40 coefficient vectors across time
4. Extract additional features: spectral centroid, zero-crossing rate, chroma features
5. Feed to trained binary classifier — Human vs Synthetic
6. Return verdict with confidence score and key synthetic indicators

### 5.4 Database Schema — Supabase

| Table | Purpose | Key Fields | Privacy Note |
|---|---|---|---|
| `users` | Auth profiles and roles | id, email, role, created_at, locale | Managed by Supabase Auth |
| `analyses` | Every fraud check — anonymized | id, user_id, input_type, feature_vector_hash, verdict, confidence, signals[], explanation, created_at | No raw message text stored |
| `feedback` | User corrections to verdicts | id, analysis_id, user_id, user_says_correct, user_label, reviewed_by, reviewed_at | Critical for false positive reduction |
| `sender_ids` | Curated bank sender ID table | id, bank_name, sender_id, verified, source_url, last_updated | Public read, admin write |
| `campaigns` | Active fraud campaign tracking | id, fingerprint_hash, first_seen, last_seen, report_count, confirmed, pattern_tags[] | Anonymized — no PII |
| `url_checks` | URL scan results cache (24hr) | id, url_hash, whois_age_days, virustotal_score, phishtank_hit, safebrowsing_hit, screenshot_url, verdict | URL hash only — not raw URL |
| `reports` | Community fraud reports | id, user_id, input_type, feature_vector, confirmed_fraud, campaign_id, created_at | PII stripped before insert |
| `model_versions` | Model training history | id, version, accuracy, precision, recall, false_positive_rate, training_size, deployed_at | Transparency record |

> **Important:** The `analyses` table never stores raw message text. Only feature vectors, verdict, and anonymized signals. PII is stripped before anything reaches the database.

### 5.5 API Endpoints — Python FastAPI

| Method | Endpoint | Input | Returns | Auth |
|---|---|---|---|---|
| POST | `/analyse/text` | message: string, lang: string | verdict, signals, explanation, highlighted_tokens, sender_check, campaign_count | Optional |
| POST | `/analyse/url` | url: string | verdict, whois, virustotal, phishtank, safebrowsing, screenshot_url, domain_age | Optional |
| POST | `/analyse/image` | image: file | ocr_text → then /analyse/text result | Optional |
| POST | `/analyse/voice` | audio: file | verdict, confidence, mfcc_features, synthetic_indicators | Optional |
| POST | `/feedback` | analysis_id, correct: bool, user_label | queued: true, review_eta | Required |
| POST | `/report` | feature_vector, input_type, confirmed_fraud: bool | campaign_id if matched, report_id | Required |
| GET | `/sender-ids/:bank` | bank name (path param) | verified_sender_ids[], source_url | Public |
| GET | `/stats/public` | none | total_checks, fraud_detected, false_positive_rate, active_campaigns | Public |
| GET | `/health` | none | status, model_version, uptime | Public |

### 5.6 Non-Functional Requirements — Phase 1

| Requirement | Target | How Achieved |
|---|---|---|
| Analysis response time | Under 3 seconds for text | Cached models loaded in memory, async Python processing |
| URL analysis time | Under 8 seconds | Parallel API calls — VirusTotal, SafeBrowsing, WHOIS simultaneously |
| False positive rate | Under 3% at launch, under 1.5% by month 3 | Human review queue corrects errors, fed back to model |
| Model accuracy | Over 90% on test set at launch | Fine-tuned on 100k+ phishing + legitimate message pairs |
| Privacy compliance | Zero PII in database | PII strip middleware before every database write |
| Uptime | 99% during active hours | Vercel (Next.js) + Railway (Python) with auto-restart |
| Guest rate limit | 3 checks per day per IP | Express middleware with counter |
| Auth rate limit | 20 checks per day per user | Supabase-backed per-user counter |

---

## 6. Phase 2 — WhatsApp Bot

**Timeline:** Weeks 7–10 (after Phase 1 live)
**Goal:** Deploy the same fraud detection engine to WhatsApp — where the primary fraud target audience lives. Maximum reach, zero install friction.

### 6.1 Why WhatsApp Is the Right Primary Channel

- 500M+ users in India — the largest single communication platform in the country
- Zero install barrier — already on every phone, every demographic
- 2-tap interaction — receive suspicious SMS, forward to bot number, get verdict
- Same channel as the fraud — defence lives where the attack arrives
- Viral spread — one family member shares bot number in family group, reaches 40+ relatives instantly
- All age groups — 65-year-old rural users and 25-year-old professionals use WhatsApp identically

### 6.2 What the Bot Reuses from Phase 1

> The WhatsApp bot adds approximately 2 files of new code — a webhook handler and a message formatter. Every other component is reused without modification.

| Component | Phase 1 Built | Bot Reuses | Bot Adds |
|---|---|---|---|
| NLP fraud classifier | ✓ Complete | ✓ Same FastAPI call | Nothing |
| URL sandbox analysis | ✓ Complete | ✓ Same FastAPI call | Nothing |
| Voice deepfake detection | ✓ Complete | ✓ Same FastAPI call | Nothing |
| OCR screenshot pipeline | ✓ Complete | ✓ Same FastAPI call | Nothing |
| Sender ID database | ✓ Complete | ✓ Same Supabase table | Nothing |
| Campaign fingerprint DB | ✓ Complete | ✓ Same Supabase table | Nothing |
| Feedback / learning loop | ✓ Complete | ✓ Same Supabase flow | Nothing |
| PII stripping middleware | ✓ Complete | ✓ Same Node.js layer | Nothing |
| Result page (/result/:id) | ✓ Complete | ✓ Bot includes link | Nothing |
| Auth / sessions | ✓ Complete | Phone number → user mapping | WA session state |
| Input handling | Browser forms | — | Webhook receiver (1 file) |
| Output formatting | HTML / React | — | Plain text + emoji formatter (1 file) |

### 6.3 Bot Conversation Design

#### First-time user flow
1. Bot sends welcome message explaining what it does and how to use it
2. User asked for preferred language — English, Hindi, Tamil, Telugu, or Other
3. Language preference stored against phone number in Supabase
4. All subsequent replies sent in chosen language
5. Bot number shared — user passes to family group

#### Standard fraud check flow
1. User forwards suspicious SMS or types message to bot
2. Bot acknowledges: "Checking your message…" (in user's language)
3. Node.js webhook strips PII, calls Python `/analyse/text` endpoint
4. Bot replies with verdict, key signals, evidence summary, and action step
5. Bot includes link to full evidence: `fraudcheck.in/result/xyz`
6. Bot asks: "Was this helpful? Reply YES or NO to help us improve"

#### Input types supported
- **Text message** — forwarded SMS, typed message, pasted email content
- **Image** — screenshot of suspicious message — OCR extracts text, runs same analysis
- **URL** — paste any suspicious link — sandbox analysis with screenshot evidence
- **Voice note** — record the suspicious call — MFCC deepfake detection

#### Reply format — designed for maximum clarity
```
[Emoji verdict] [Verdict in 5 words]

[Evidence bullet 1]
[Evidence bullet 2]
[Evidence bullet 3]

[One action step — what to do right now]

[Full evidence link]
```

**Example — High fraud reply:**
```
🚨 HIGH RISK — This is a scam.

• Sender "SBI-ALERT" is not registered to SBI (real: SBIBNK)
• Link opens a fake login page asking for your password
• 412 people reported this same message this week

Do NOT act. Call SBI fraud helpline: 1800-11-2211

Full evidence: fraudcheck.in/result/abc123
```

**Example — Safe message reply:**
```
✅ This looks legitimate.

• Sender SBIBNK is officially verified for SBI
• No links or credential requests in the message
• Format matches genuine SBI transaction alerts

Still unsure? Call SBI on 1800-11-2211 (the number in the message — it is real).
```

### 6.4 WhatsApp API Setup

| Component | Choice | Reason |
|---|---|---|
| WhatsApp gateway | Meta Cloud API or Twilio WhatsApp Business | Official API — compliant, scalable |
| Webhook receiver | Node.js + Express.js endpoint | Same stack as existing middleware |
| Session management | Supabase — phone number to user_id mapping | Persistent across conversations |
| Message queue | Node.js async queue | Handles burst traffic |
| Rate limiting | 10 checks per phone number per day | Prevents abuse |
| Media download | WhatsApp API media endpoint | Images and voice notes downloaded before processing |

### 6.5 Multilingual Support

| Language | Support Level | Model | Notes |
|---|---|---|---|
| English | Full — Phase 2 launch | BERT-base / DistilBERT | Largest training data — highest accuracy |
| Hindi | Full — Phase 2 launch | IndicBERT / mBERT | Second largest fraud volume in India |
| Tamil | Partial — Phase 2, full Phase 3 | mBERT | Significant user base in Tamil Nadu |
| Telugu | Partial — Phase 2, full Phase 3 | mBERT | Significant user base in Andhra / Telangana |
| Kannada / Marathi | Phase 3 | mBERT | Added as community report volume grows |

---

## 7. Phase 3 — Bank API & Institutional Integration

**Timeline:** Month 4+ (after website + bot proven)
**Goal:** Expose the battle-tested Python engine as a documented REST API for banks, UPI apps, and telecoms. Convert proven accuracy into institutional contracts.

### 7.1 What Changes in Phase 3

Nothing in the AI engine changes. Phase 3 adds:

- API key management — banks authenticate with API keys, usage tracked per key
- SLA documentation — response time guarantees, uptime commitments
- On-premise deployment package — Docker container for banks requiring data sovereignty
- Institutional dashboard — usage analytics, accuracy metrics, custom reporting per bank client
- Webhook support — banks receive real-time alerts when their customers report fraud campaigns

### 7.2 Deployment Options for Banks

#### Option A — Cloud API
Bank calls our hosted API endpoint. Fastest to integrate. Suitable for regional banks, co-operative banks, fintechs.
- Integration time: 1–2 days
- No infrastructure required
- Pay-per-call pricing
- Data: anonymized features only transmitted

#### Option B — On-Premise Docker
Bank deploys our Docker container on their own servers. Data never leaves their infrastructure. Required by large banks for compliance.
- Integration time: 1–2 weeks
- Bank owns all infrastructure
- Annual license pricing
- Full data sovereignty — RBI compliant

### 7.3 Path to DLT / DIP Integration

> TRAI DLT has no direct public API. The DoT Digital Intelligence Platform (DIP) provides APIs to 1000+ banks — but requires institutional onboarding. FraudShield reaches DIP access through demonstrated performance, not permission requests.

1. Phase 1 website generates real accuracy data — false positive rate, fraud detection rate, campaign detection speed
2. Phase 2 bot generates scale — thousands of checks, real-world Indian fraud patterns, community report volume
3. With 6 months of data, apply to DoT Sanchar Saathi startup collaboration program — explicit pathway for innovators
4. One pilot bank integration provides institutional backing — banks already have DLT access, enabling indirect verification
5. College / university formal research partnership with telecom operator — academic channel opens different doors
6. DIP integration gives access to real-time government fraud intelligence that no consumer product currently has

**Why DLT access is not a blocker for Phase 1–2:**
The sender ID verification database built from official bank websites covers 95% of Indian banking fraud immediately. Every major bank publishes their legitimate SMS sender IDs on their official website — this is public, verifiable, and source-backed. A mismatch against this database is factual evidence, not an algorithm's opinion.

**Free URL verification alternatives available now (no institutional access needed):**
- Google Safe Browsing API — free, any developer account
- VirusTotal API — free tier, 4 requests/minute
- PhishTank API — completely free, open registration
- WHOIS domain data — public by law

### 7.4 Revenue Model

| Customer Segment | Offering | Pricing Model | Target Timeline |
|---|---|---|---|
| Individual users | Free — website + WhatsApp bot | Free — builds dataset and trust | Phase 1–2 |
| Regional / co-op banks | Cloud API access | Per-call pricing — ₹0.50 per analysis | Phase 3 |
| Large banks (SBI, HDFC, ICICI) | On-premise Docker + SLA | Annual license — ₹15–50L depending on scale | Phase 3–4 |
| UPI apps (PhonePe, GPay) | SDK + API integration | Revenue share on fraud prevented | Phase 4 |
| Telecoms (Airtel, Jio) | Network-level SMS analysis | Per-subscriber annual fee | Phase 4 |
| CERT-In / DoT | National fraud intelligence dashboard | Government contract | Phase 4 |

---

## 8. Trust Architecture

Trust is not a feature — it is the entire product. Every architectural decision in FraudShield is made to maximize user trust through evidence and transparency, not through claims.

### 8.1 The Six Trust Layers

#### Layer 1 — Ground Truth Comparison
Every fraud verdict is accompanied by a side-by-side comparison: the suspicious message vs a genuine message from the claimed bank. Users see with their own eyes the structural difference. No algorithm's opinion is required — the comparison is self-evident.

#### Layer 2 — Sender ID Verification
The system checks the message sender ID against a database compiled from official bank websites. When SBI's own website states their SMS comes from SBIBNK and the message arrived from SBI-ALERT, that discrepancy is a factual, government-source-backed finding. Users can independently verify.

#### Layer 3 — URL Sandbox with Screenshot Evidence
No user should click a suspicious link to verify it. The system visits the URL in an isolated sandbox environment, captures a screenshot of what loads, and shows the user what the fraudster built. A photograph of a fake bank login page is more convincing than any verdict.

#### Layer 4 — Community Report Count
"312 other people forwarded this exact message to us in the last 3 days, and our analysts confirmed it is an active scam campaign." Social proof at scale — the individual is not relying on an algorithm but on a community that collectively caught this pattern.

#### Layer 5 — Transparent Model Reasoning
Attention weights from the transformer are surfaced as highlighted tokens in the original message. The system explains which specific words and phrases, appearing together in this structure, drove the verdict — and what percentage of confirmed fraud cases in training data showed the same pattern.

#### Layer 6 — Public Accuracy Dashboard
A system that publishes its own false positive rate, fraud detection rate, and error cases — openly, updated weekly — has nothing to hide. Closed systems that produce opaque scores cannot be trusted. Open systems that show their track record earn trust over time.

### 8.2 What the System Never Does

- Never stores raw message content — PII stripped before any processing
- Never sends user data to external services — all analysis runs locally or via anonymous-hash API calls
- Never claims certainty — every verdict includes confidence level and uncertainty acknowledgment
- Never blocks without explanation — every verdict includes the full reasoning
- Never punishes wrong reports — feedback that the system made an error is welcomed, reviewed, and used to improve

### 8.3 The Core Trust Principle

> The goal is not for users to trust FraudShield. The goal is for FraudShield to make users capable of judging the message themselves, armed with evidence the system assembled. When users feel informed rather than told, they trust both the verdict and the system that produced it.

---

## 9. Unique Differentiators

### 9.1 The Defensible Position

| Every Other Tool Does This | FraudShield Does This Instead |
|---|---|
| Matches keywords — "urgent" found → flagged | Understands intent — threat + credential ask + fake URL = fraud structure |
| Gives a score — "87/100 — trust us" | Shows verifiable evidence — sender not in TRAI, link screenshot, 300 reports |
| Static — trained once, misses new patterns | Continuously learning — every report makes it smarter for everyone |
| Separate app to download — creates friction | Lives in WhatsApp — forward in 2 taps, zero install |
| English only — excludes most at-risk users | Multilingual — Hindi, Tamil, Telugu natively supported |
| Sends data to cloud — banks reject it | On-premise deployable — bank data never leaves their infrastructure |
| Number reputation only — fraudsters rotate numbers | Message content analysis — new numbers, same structural fraud pattern detected |
| Verdict without reasoning — black box | Full attention weight explanation — users see exactly what triggered it |
| Reactive — activated after money lost | Pre-fraud — intercepts before user acts on the message |

### 9.2 The Compounding Moat

Technology can be replicated. Data cannot. Every fraud message reported through FraudShield — confirmed by human analysts, stripped of PII, fed into the training pipeline — creates a dataset of real Indian banking fraud patterns that grows continuously and cannot be purchased or replicated by a competitor launching tomorrow.

At 6 months: the model has learned from thousands of real UPI scam messages, SBI impersonation campaigns, HDFC phishing SMS patterns, and Hindi/Tamil fraud scripts.

At 12 months: significantly more accurate than at launch — specifically on patterns actively targeting Indian banking customers right now, not historical patterns from a generic dataset.

> The system gets smarter every day it is used. A competitor launching today starts from zero. That asymmetry is the moat.

---

## 10. Data Strategy

### 10.1 Training Data — Phase 1 Sources

- Enron email dataset — 500k+ labelled legitimate / spam emails
- UCI SMS Spam Collection — 5,574 labelled SMS messages
- Kaggle phishing email datasets — multiple collections, 10k–100k messages
- HuggingFace phishing datasets — pre-labelled, community maintained
- Synthetic generation — LLMs prompted to generate Indian banking phishing SMS in English, Hindi, Tamil for training variety
- Community collection — friends, family, Reddit India, consumer complaint forums — people share fraud messages publicly

### 10.2 The Sender ID Ground Truth Database

Built from official sources — no API required:
- Official bank websites — each bank publishes their SMS sender IDs in FAQ or security sections
- RBI circulars — RBI periodically publishes advisories listing legitimate bank communication channels
- NPCI documentation — official UPI and payment notification sender IDs
- Consumer protection forum verification — cross-reference with user-confirmed legitimate messages

**Coverage target:** 50+ banks at launch, covering 99% of Indian banking fraud by institution

### 10.3 Privacy & Data Governance

| Data Type | Stored? | How Stored | Retention |
|---|---|---|---|
| Raw message text | Never | PII stripped before any processing | N/A |
| Feature vectors | Yes — anonymized | Mathematical representation only — no reconstructable content | Indefinite for training |
| Verdict + signals | Yes — per analysis | Linked to user_id via RLS, not to message content | 12 months then archived |
| User feedback | Yes | analysis_id + correct/incorrect label + optional note | Indefinite for model improvement |
| Campaign fingerprints | Yes | Hash of pattern features — not reconstructable | Indefinite |
| Voice MFCC features | No | Computed in memory, verdict stored, audio deleted immediately | Audio: 0 seconds |
| URL scan results | Yes — cached 24hr | URL hash (not raw URL), scan verdicts from external services | 24 hours then deleted |

---

## 11. Recommended Build Sequence

> Build the intelligence first. Build the interface second. Build the distribution channel third. This sequence ensures the most important layer — the AI engine — is tested and proven before any time is spent on presentation.

| Week | Focus | Deliverable | Validates |
|---|---|---|---|
| 1 | Data & model setup | Training dataset assembled, BERT fine-tuning pipeline running, initial accuracy baseline measured | Model learns to distinguish fraud from legitimate |
| 2 | Python FastAPI skeleton | POST /analyse/text returning verdict + signals, running locally | Core AI endpoint functional |
| 3 | Sender ID DB + URL analysis | Sender ID table built, Google SafeBrowsing + VirusTotal + WHOIS integrated | Evidence engine producing verifiable proof |
| 4 | Next.js frontend — analyser | Landing page + /analyse page with text and URL tabs, calling Python API | End-to-end flow works website to verdict |
| 5 | Supabase integration + auth | Database schema live, Supabase Auth working, analyses stored, rate limiting active | Security and data layer proven |
| 6 | Feedback loop + admin panel | Feedback flow working, admin review queue built, /transparency page live with real stats | Learning loop complete — system can improve itself |
| 7 | OCR + voice + screenshot | Image upload with Tesseract, voice upload with MFCC, URL sandbox with screenshot | All four input types supported |
| 8 | WhatsApp webhook | Twilio webhook receiving messages, formatting calls to Python API, replying with verdict | Bot functional end-to-end |
| 9 | Multilingual support | Hindi bot replies working, IndicBERT model integrated, language detection active | Primary Indian demographic served |
| 10 | Hardening + accuracy review | False positive audit, model retrain on collected feedback, performance optimization | System ready for wider use |

---

## 12. Success Metrics

| Metric | Phase 1 Target | Phase 2 Target | Phase 3 Target |
|---|---|---|---|
| Fraud detection accuracy | >90% on test set | >93% on live data | >95% sustained |
| False positive rate | <3% | <2% | <1.5% |
| Analysis response time | <3 seconds text | <3 seconds on WhatsApp | <2 seconds via API |
| Community reports collected | 500 in 6 weeks | 5,000 in 3 months | 50,000 in 12 months |
| Confirmed fraud campaigns detected | 50 in 2 months | 500 in 6 months | 5,000 cumulative |
| WhatsApp bot users | N/A | 1,000 in month 1 | 100,000 in 12 months |
| Bank API integrations | N/A | N/A | 1 pilot bank in month 6 |
| Languages supported | English | English + Hindi | English, Hindi, Tamil, Telugu |
| User feedback response rate | >20% | >15% | >10% |

### 12.1 The North Star Metric

> The north star metric is not users or accuracy percentage. It is: number of fraud attempts intercepted before the user acted. Every other metric is a proxy for this one. A user who checked a message and did not click the link — that is the outcome that matters.

---

## 13. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| Model extraction — bad actors study what bypasses the system | High | Medium | Rate limiting, auth requirements, model versioning, adversarial training examples |
| High false positive rate damages trust | High | Medium at launch | Human review queue, aggressive FP audit, feedback loop, conservative thresholds initially |
| WhatsApp API access denied or expensive | High | Low | Twilio as backup gateway, Meta direct API as primary, budget in plan |
| Fraud evolves faster than model updates | Medium | Certain over time | Weekly fine-tuning cycle, community reporting as early warning, model monitoring alerts |
| Privacy concern — users fear their messages are stored | High | Medium | Transparent privacy policy, PII stripping verifiable in open-source code, public audit |
| DLT sender verification not available | Low | Current reality | Own curated sender ID database covers 95% of cases — not dependent on DLT access |
| Regulatory requirement to register as fraud detection service | Medium | Low initially | Academic project framing for Phase 1, formal registration before Phase 3 bank contracts |

---

## 14. Appendix

### A. Folder Structure — Phase 1 + Phase 2

```
fraudshield/
├── apps/
│   ├── web/                          # Next.js website
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── analyse/
│   │   │   │   └── page.tsx          # Full analyser page
│   │   │   ├── result/
│   │   │   │   └── [id]/page.tsx     # Shareable result page
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx          # User dashboard
│   │   │   ├── transparency/
│   │   │   │   └── page.tsx          # Public accuracy record
│   │   │   └── admin/
│   │   │       └── page.tsx          # Admin panel (protected)
│   │   ├── components/
│   │   │   ├── Analyser.tsx          # Core analyser UI
│   │   │   ├── EvidencePanel.tsx     # Evidence breakdown display
│   │   │   ├── HighlightedMessage.tsx# Token highlighting
│   │   │   ├── SignalCard.tsx        # Per-signal evidence card
│   │   │   └── VerdictBanner.tsx     # Top-level verdict display
│   │   └── lib/
│   │       ├── api.ts                # API client calling Node.js
│   │       └── auth.ts               # Supabase auth helpers
│   │
│   └── bot/                          # WhatsApp bot — Phase 2
│       ├── webhook.js                # Receives WhatsApp messages (1 file)
│       └── formatter.js              # Formats API response for WhatsApp (1 file)
│
├── services/
│   ├── api/                          # Node.js + Express.js gateway
│   │   ├── routes/
│   │   │   ├── analyse.js            # Route to Python AI
│   │   │   ├── feedback.js           # Feedback submission
│   │   │   └── stats.js              # Public stats endpoint
│   │   ├── middleware/
│   │   │   ├── piiStrip.js           # PII stripping — runs first
│   │   │   ├── rateLimit.js          # Per-IP and per-user limits
│   │   │   └── auth.js               # Supabase auth verification
│   │   └── index.js                  # Express app entry
│   │
│   └── ai/                           # Python FastAPI backend
│       ├── main.py                   # FastAPI app entry point
│       ├── models/
│       │   ├── bert_classifier.py    # Fine-tuned BERT fraud classifier
│       │   ├── ner_pipeline.py       # spaCy NER pipeline
│       │   └── mfcc_classifier.py    # Voice deepfake detector
│       ├── pipelines/
│       │   ├── text_pipeline.py      # Full text analysis flow
│       │   ├── url_pipeline.py       # URL sandbox + WHOIS + APIs
│       │   ├── voice_pipeline.py     # Audio MFCC analysis
│       │   └── ocr_pipeline.py       # Tesseract OCR → text
│       ├── evidence/
│       │   ├── sender_ids.py         # Sender ID lookup + verification
│       │   ├── campaign_db.py        # Campaign fingerprint matching
│       │   └── url_checks.py         # External URL API calls
│       └── explainer/
│           └── attention_explainer.py # Attention weights → plain language
│
└── supabase/
    ├── migrations/                   # Database schema migrations
    │   ├── 001_initial_schema.sql
    │   └── 002_sender_ids.sql
    └── seed/
        ├── sender_ids.json           # Bank sender ID seed data
        └── test_messages.json        # Labelled test messages for accuracy
```

### B. Key External Services & Credentials

| Service | Purpose | Cost | How to Get |
|---|---|---|---|
| Supabase | Database + Auth | Free tier sufficient for Phase 1 | supabase.com — free account |
| Google Safe Browsing API | URL phishing check | Free up to 10k requests/day | Google Cloud Console — free API key |
| VirusTotal API | URL/file scan — 70+ engines | Free — 4 requests/minute | virustotal.com — free account |
| PhishTank API | Phishing URL database | Free — open API | phishtank.com — free registration |
| Twilio WhatsApp | WhatsApp bot gateway | Free sandbox for testing | twilio.com — student sandbox available |
| Vercel | Next.js hosting | Free tier sufficient for Phase 1 | vercel.com — free account |
| Railway / Render | Python FastAPI hosting | Free tier — 500 hours/month | railway.app or render.com |
| HuggingFace | Pre-trained BERT models | Free — open source weights | huggingface.co — free account |

### C. Indian Bank Sender ID Reference (Seed Data)

| Bank | Verified Sender IDs | Official Source |
|---|---|---|
| State Bank of India | SBIBNK, SBIPSG, SBIATM, SBIINB, SBIMSG | sbi.co.in/security |
| HDFC Bank | HDFCBK, HDFCBN, HDFC, HDFCEW | hdfcbank.com/security |
| ICICI Bank | ICICIB, ICICI, ICICIN, ICICIP | icicibank.com/security |
| Axis Bank | AXISBK, AXIS, AXISBN | axisbank.com/security |
| Kotak Mahindra Bank | KOTAKB, KOTAK, KOTAKS | kotak.com/security |
| Punjab National Bank | PNBSMS, PNB, PNBALR | pnbindia.in/security |
| Bank of Baroda | BOBANK, BOB, BOBSMS | bankofbaroda.in/security |
| Canara Bank | CNRBNK, CANARA | canarabank.com |
| Union Bank of India | UBIBNK, UNINON | unionbankofindia.co.in |
| Paytm Payments Bank | PAYTMB, PYTMBNK, PAYTM | paytmbank.com/security |
| RBI | RBISAY, RBI, RBIIND | rbi.org.in |
| NPCI / UPI | NPCIUP, UPIIND, NPCI | npci.org.in |

### D. Model Training — Quick Reference

```python
# Fine-tuning setup — Phase 1
model_name = "bert-base-multilingual-cased"   # English + Hindi + Tamil + Telugu
# OR
model_name = "ai4bharat/indic-bert"            # Optimized for Indian languages

# Datasets to load
datasets = [
    "datasets/enron_phishing_labelled.csv",
    "datasets/uci_sms_spam.csv",
    "datasets/kaggle_phishing_emails.csv",
    "datasets/synthetic_indian_banking_sms.csv",  # Generated
    "datasets/community_reports.csv",             # Collected from users
]

# Training config
BATCH_SIZE = 16
LEARNING_RATE = 2e-5
EPOCHS = 3
MAX_SEQ_LENGTH = 256  # SMS messages are short — 256 sufficient
```

---

> **FraudShield is not another fraud awareness tool. It is the citizen-facing intelligence layer that India's fraud defence ecosystem is missing — built with the right technology, the right channel, the right architecture, and the right understanding of who actually needs it.**

---

*Document ends — v1.0 — March 2026*