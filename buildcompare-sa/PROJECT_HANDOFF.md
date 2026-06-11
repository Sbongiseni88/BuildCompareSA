# BuildCompare SA — Project Handoff & State Document

> **To the next assistant/developer reading this:**
> This file contains the exact state of the project, setup instructions, and the
> context of what we were working on. Review it together with
> `.agent/tender_pivot_plan.md` and `.agent/rules/team_standards.md` before
> changing anything.

---

## 🏗️ Architecture Overview

**BuildCompare SA** is a B2B SaaS platform for South African contractors bidding
on government tenders: upload a Bill of Quantities, get a 5-store supplier price
matrix, BCCEI-compliant labour estimates, and a tender-grade sourcing file.

- **Frontend + API:** Next.js 16 (App Router), React 19, TailwindCSS, TypeScript.
  All server-side business logic lives in Next.js API routes (`src/app/api/`).
- **Scraper microservice:** `scraper/` — FastAPI + Playwright (Browserbase CDP in
  production), port **8001**. The ONLY surviving Python service. Treated as a
  black-box HTML fetcher; no business logic belongs in it.
- **Database/Auth:** Supabase (RLS-protected; schema in `supabase/`).
- **AI providers:** DeepSeek (`deepseek-chat`) is canonical; Groq is the only
  fallback. Chain at every call site: `DeepSeek → Groq → throw`. Gemini and
  direct OpenAI usage are forbidden (the `openai` npm package exists solely as
  DeepSeek's transport).

> The standalone Python FastAPI `backend/` (RAG/ChromaDB, OCR, chat concierge,
> port 8000) was **deleted** in the tender-pivot refactor (June 2026). Its
> calculators were ported to `src/lib/calculations.ts`. Do not reintroduce it.

---

## 🛠️ Environment & Setup Instructions

### 1. Prerequisites

- **Node.js**: v20+
- **Python**: v3.9+ (scraper microservice only)

### 2. Required Environment Variables
Copy `.env.example` → `.env.local` and fill in:

```env
DEEPSEEK_API_KEY="..."        # REQUIRED — canonical AI provider
GROQ_API_KEY="..."            # optional — fallback provider
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SCRAPER_URL="http://127.0.0.1:8001"
BROWSERBASE_API_KEY="..."     # optional — cloud Chromium for the scraper
BROWSERBASE_PROJECT_ID="..."
```

### 3. Run the frontend (port 3000)

```bash
cd buildcompare-sa
npm install
npm run dev
```

### 4. Run the scraper microservice (port 8001)

```bash
cd buildcompare-sa
python3 -m venv scraper/venv && source scraper/venv/bin/activate
pip install fastapi uvicorn playwright beautifulsoup4 pandas httpx python-multipart openpyxl
playwright install chromium
uvicorn scraper.main:app --port 8001
```

---

## 🚀 Current State (tender-pivot refactor)

1. **BoQ engine** (`src/lib/boq-engine.ts` + `/api/analyze`): direct structural
   Excel parse first, DeepSeek extraction fallback. Tender-grade integrity
   contract enforced — descriptions must be literal material specs (never item
   refs), the category `"other"` is banned, every row classifies into one of the
   8 BCCEI categories, and labour resolves through the BCCEI estimator.
2. **5-store retail matrix** (`src/lib/retail-matrix.ts`, `scraper/main.py`):
   Builders Warehouse, Cashbuild, Leroy Merlin, BUCO, Build it — each column is
   fetched independently; failures report `N/A`, never mirror another store.
3. **BCCEI labour compliance** (`src/lib/bccei/`): gazetted 2025/2026 wage
   matrix (Y1/Y2/Y3 with automatic 1-Sep switchovers), task-grade mapping per
   BoQ category, audit-traceable `basis` string on every estimate.
4. **Sourcing file export** (`src/lib/sourcing-file.ts`): fixed 13-column
   tender-grade Excel layout, ⭐-prefixed cheapest supplier, executive summary in
   rows 1–5. Buttons read "Download Sourcing File" / "Save Report".
5. **UI**: Save-to-Project bridge from PriceSearchHub into ProjectsManager;
   single-panel Smart Estimator; skeleton loaders + an 8s failsafe on Dashboard;
   no `font-light`/`font-thin` anywhere (contractor-age-friendly typography).
6. **Tests**: Jest suites cover boq-engine, calculations, retail-matrix,
   sourcing-file, tender-categories, BCCEI labour, and rate-limit.

### 📝 Key Reference Files

- `.agent/tender_pivot_plan.md` — the master plan + execution log.
- `.agent/rules/team_standards.md` — AI provider chain, export format, BCCEI and
  retail-matrix invariants. **Read before writing code.**
- `.agent/skills/` — deterministic project skills (BoQ parsing contract, BCCEI
  gazette mapper, retail matrix normalization).

---

## 🎯 Next Steps / Where to pick up

1. **Server-side auth on API routes** — routes under `src/app/api/` currently
   trust the client; add Supabase session checks (top finding of the June 2026
   audit).
2. **BUCO / Build it scraper tuning** — URL shapes are best-effort; verify
   against the live sites and adjust selectors.
3. **Replace the `xlsx` npm package** — known unfixed CVEs upstream; migrate to
   `exceljs` or the SheetJS CDN build.
4. **Distributed rate limiting** — the in-memory limiter resets per serverless
   instance; move to Upstash/Redis before scale.
