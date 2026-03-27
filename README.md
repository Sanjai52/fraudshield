<div>

# FraudShield

**AI That Sees Through Scams.**

AI-powered fraud detection for SMS, WhatsApp messages, emails, and URLs, built for everyday users in India.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![HuggingFace](https://img.shields.io/badge/HuggingFace-MuRIL-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black)](https://huggingface.co/)

</div>

---

## What is FraudShield?

FraudShield analyzes suspicious messages and URLs using NLP and URL intelligence, returning a clear verdict (SAFE / SUSPICIOUS / DANGEROUS), a confidence score, an explanation of why it's risky, and actionable advice on what to do next.

---

## Project Structure

```
fraudshield/
├── apps/
│   └── web/                   # Next.js 14 frontend (TypeScript + Tailwind)
├── services/
│   ├── ai/                    # Python FastAPI AI engine
│   │   ├── main.py
│   │   ├── pipelines/         # text_pipeline, url_pipeline
│   │   ├── evidence/          # sender_ids, url_checks
│   │   ├── models/
│   │   └── requirements.txt
│   └── api/                   # Node.js middleware
├── ml/                        # ML scripts and dataset preparation
└── supabase/                  # DB schema and config
```

---

## Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm

### 1. AI Engine (FastAPI — Port 8000)

```bash
cd services/ai
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs → http://127.0.0.1:8000/docs  
Health check → http://127.0.0.1:8000/health

### 2. Frontend (Next.js — Port 3000)

```bash
cd apps/web
npm install
npm run dev
```

Open → http://localhost:3000

### Run Both Together

**Terminal 1 — AI Engine:**
```bash
cd services/ai && uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd apps/web && npm run dev
```

---

## API Endpoints

| Method | Endpoint | Status |
|--------|----------|--------|
| GET | `/health` | Live |
| GET | `/stats/public` | Live |
| POST | `/analyse/text` | Live |
| POST | `/analyse/url` | Live |
| GET | `/sender-ids/{bank}` | Live |
| POST | `/analyse/image` | Week 7 |
| POST | `/analyse/voice` | Week 7 |
| POST | `/feedback` | Week 5 |
| POST | `/report` | Week 5 |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| AI Engine | Python, FastAPI, Uvicorn |
| NLP Model | `google/muril-base-cased` via HuggingFace |
| URL Analysis | WHOIS, Google Safe Browsing, VirusTotal, PhishTank |
| Database | Supabase (PostgreSQL) |
| Middleware | Node.js + Express.js |

---
