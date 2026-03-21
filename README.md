# FraudShield

> AI-powered fraud detection platform protecting Indian banking customers from GenAI-generated SMS, WhatsApp, email, and voice fraud.

---

## Overview

FraudShield is a citizen-facing fraud detection system that performs deep linguistic analysis on suspicious messages and returns **verifiable evidence** — not an opaque score. Unlike existing tools that rely on keyword matching or phone number blacklists, FraudShield understands intent, entity relationships, tone, and structural fraud patterns.

The platform addresses a critical gap in India's fraud defence landscape: a channel-agnostic, explanation-first detection system that works where fraud actually arrives — on the user's phone — **before money is lost.**

---

## The Problem

AI-generated fraud has fundamentally changed the threat landscape:

- LLM-generated phishing messages are grammatically flawless and contextually personalized
- Deepfake voice technology convincingly impersonates bank officers
- Spoofed sender IDs bypass DLT-based filters
- UPI transactions complete in seconds — recovery after loss is nearly impossible
- The most vulnerable users (elderly, first-generation digital banking users) are specifically targeted

---

## The Solution

FraudShield combines:

- **Transformer-based NLP** — reads intent and relationships, not keywords
- **Verifiable evidence** — sender ID verification, URL sandboxing, real bank message comparison
- **Community-powered detection** — crowd reports become training signals
- **Continuous learning** — every confirmed case fine-tunes the model weekly
- **Privacy-first architecture** — PII stripped before processing, zero raw data stored
- **Multilingual support** — Hindi, Tamil, Telugu, and English

---

## Deployment Phases

| Phase | Channel | Status |
|---|---|---|
| Phase 1 | Next.js Website | 🔲 Building |
| Phase 2 | WhatsApp Bot | 🔲 Planned |
| Phase 3 | Bank REST API | 🔲 Planned |

The same Python AI backend powers all three surfaces. No logic is ever rebuilt — each new channel adds only a thin adapter layer.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (React) |
| API Gateway | Node.js + Express.js |
| AI Backend | Python + FastAPI |
| NLP Model | Google MuRIL (fine-tuned) |
| NER | spaCy |
| Voice Analysis | librosa + MFCC |
| URL Sandbox | Playwright |
| OCR | Tesseract |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel + Railway |

---

## Model — `muril-fraud-v1`

Fine-tuned on **108,891 labelled samples** of fraud and legitimate Indian banking messages.

| Metric | Value |
|---|---|
| Base model | `google/muril-base-cased` |
| Training samples | 76,223 |
| Validation F1 | **0.9733** |
| False positive rate | **0.0113** (target < 0.03) |
| Languages | English, Hindi |

### Training Data Sources

| Source | Samples |
|---|---|
| HuggingFace phishing datasets | 55,636 |
| Enron email corpus | 28,786 |
| Kaggle banking phishing | 17,052 |
| UCI SMS spam | 5,075 |
| Synthetic Indian banking SMS | 2,342 |
| **Total** | **108,891** |

> Model weights are not stored in this repository. Download from Google Drive and place in `ml/registry/muril-fraud-v1/`.

---

## Project Structure

```
fraudshield/
│
├── apps/
│   ├── web/                        # Next.js website (Phase 1)
│   │   ├── app/
│   │   │   ├── admin/              # Admin panel
│   │   │   ├── analyse/            # Full analyser page
│   │   │   ├── dashboard/          # User dashboard
│   │   │   ├── result/             # Shareable result page
│   │   │   └── transparency/       # Public accuracy record
│   │   ├── components/             # React components
│   │   └── lib/                    # API client + auth helpers
│   │
│   └── bot/                        # WhatsApp bot (Phase 2)
│
├── ml/                             # All machine learning workstream
│   ├── data/
│   │   ├── raw/                    # Source datasets (gitignored)
│   │   │   ├── huggingface/
│   │   │   ├── indian-banking/
│   │   │   └── kaggle/
│   │   └── processed/              # Cleaned train/val/test splits (gitignored)
│   │
│   ├── registry/
│   │   └── muril-fraud-v1/         # Trained model weights (gitignored)
│   │
│   ├── notebooks/                  # Experiment notebooks
│   │
│   ├── scripts/
│   │   ├── collect/                # Download datasets from HuggingFace + Kaggle
│   │   ├── generate/               # Synthetic SMS generation + Reddit scraping
│   │   ├── process/                # Combine, clean, split datasets
│   │   ├── train/                  # Fine-tune + evaluate model
│   │   └── evaluate/               # Inference wrapper + smoke test
│   │
│   └── requirements-ml.txt
│
├── services/
│   ├── ai/                         # Python FastAPI — fraud detection engine
│   │   ├── pipelines/              # text, url, voice, ocr pipelines
│   │   ├── evidence/               # sender ID, campaign, URL checks
│   │   ├── explainer/              # attention weights → plain language
│   │   └── models/                 # classifier wrappers
│   │
│   └── api/                        # Node.js + Express.js gateway
│       ├── routes/                 # analyse, feedback, stats
│       └── middleware/             # PII strip, rate limit, auth
│
├── supabase/
│   ├── migrations/                 # Database schema migrations
│   └── seed/
│       └── sender_ids.json         # Verified bank sender ID database
│
├── .gitignore
├── PRODUCT.md                      # Full product requirements document
└── README.md
```

---

## ML Pipeline — Run Order

To reproduce the dataset and retrain the model from scratch:

```
1. ml/scripts/collect/collect_huggingface_datasets.py
2. ml/scripts/collect/collect_kaggle_datasets.py
3. ml/scripts/generate/generate_synthetic_sms.py
4. ml/scripts/generate/scrape_reddit_fraud_posts.py   ← manual labelling step
5. ml/scripts/process/prepare_combine_datasets.py
6. ml/scripts/process/prepare_sender_id_database.py
7. ml/scripts/train/train_finetune_model.py            ← run on GPU (Colab recommended)
8. ml/scripts/train/train_evaluate_model.py            ← run once on locked test set
9. ml/scripts/evaluate/inference_fraud_classifier.py   ← smoke test
```

All scripts are run from the `fraudshield/` root directory.

---

## Sender ID Database

`supabase/seed/sender_ids.json` contains verified sender IDs for 12 major Indian banks + RBI + NPCI, compiled from official bank websites.

| Coverage | Count |
|---|---|
| Banks covered | 12 + RBI + NPCI |
| Verified sender IDs | 50+ |
| Known fake patterns | 60+ |

Includes: SBI, HDFC, ICICI, Axis, Kotak, PNB, Bank of Baroda, Canara, Union Bank, Paytm Bank, RBI, NPCI.

---

## API Endpoints (Phase 1 — FastAPI)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/analyse/text` | Analyse SMS or message text |
| POST | `/analyse/url` | Sandbox URL analysis |
| POST | `/analyse/image` | OCR screenshot → text analysis |
| POST | `/analyse/voice` | MFCC deepfake voice detection |
| POST | `/feedback` | Submit verdict correction |
| POST | `/report` | Report confirmed fraud to community DB |
| GET | `/sender-ids/:bank` | Verified sender IDs for a bank |
| GET | `/stats/public` | Live accuracy and fraud stats |
| GET | `/health` | Service health + model version |

---

## Database Schema (Supabase)

| Table | Purpose |
|---|---|
| `users` | Auth profiles and roles |
| `analyses` | Every fraud check — anonymized, no raw text stored |
| `feedback` | User verdict corrections — feeds learning loop |
| `sender_ids` | Curated bank sender ID table |
| `campaigns` | Active fraud campaign fingerprints |
| `url_checks` | URL scan results cache (24hr TTL) |
| `reports` | Community fraud reports |
| `model_versions` | Model training history — transparency record |

> Raw message content is **never stored**. PII is stripped before any database write.

---

## Privacy Architecture

- PII stripped in Node.js middleware before any Python backend call
- Raw message content never reaches the database
- Only anonymized feature vectors and verdicts are stored
- URL scans use hash of URL — not raw URL
- Voice audio deleted immediately after MFCC extraction
- Anonymous mode available — no session, no storage, no tracking

---

## Success Metrics

| Metric | Phase 1 Target | Current (v1) |
|---|---|---|
| Fraud detection F1 | > 0.90 | **0.9733** ✅ |
| False positive rate | < 0.03 | **0.0113** ✅ |
| Analysis response time | < 3 seconds | — |
| Languages supported | English | English + Hindi |

---

## Competitive Position

| Capability | Sanchar Saathi | Truecaller | Google Messages | FraudShield |
|---|---|---|---|---|
| Deep NLP content analysis | ✗ | ✗ | Partial | ✅ |
| WhatsApp native | ✗ | ✗ | ✗ | ✅ |
| Multilingual (Hindi/Tamil) | ✗ | Partial | Partial | ✅ |
| Explains why it flagged | ✗ | ✗ | ✗ | ✅ |
| Pre-fraud interception | ✗ | Partial | Partial | ✅ |
| Continuously learning | ✗ | ✗ | ✗ | ✅ |

---

## Roadmap

- [x] Training dataset assembled (108,891 samples)
- [x] MuRIL model fine-tuned (F1: 0.9733)
- [x] Sender ID database built (12 banks)
- [x] Project structure finalized
- [ ] Python FastAPI backend (Week 2)
- [ ] Sender ID + URL evidence engine (Week 3)
- [ ] Next.js website (Week 4)
- [ ] Supabase schema + auth (Week 5)
- [ ] Feedback loop + admin panel (Week 6)
- [ ] WhatsApp bot (Week 7–8)
- [ ] Multilingual support — Hindi full (Week 9)
- [ ] Bank REST API (Month 4+)

---

## Setup

### ML Environment

```bash
cd fraudshield/
python -m venv ml/venv
ml/venv/Scripts/activate        # Windows
pip install -r ml/requirements-ml.txt
```

### Run Smoke Test (model must be in ml/registry/muril-fraud-v1/)

```bash
python ml/scripts/evaluate/inference_fraud_classifier.py
```

---

## License

Academic project — SSN Institute of Technology, March 2026.
