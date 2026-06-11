# BuildCompare SA

B2B SaaS platform for South African construction contractors bidding on government tenders. Upload a Bill of Quantities, get a tender-grade sourcing file: live retail prices across five major SA suppliers, BCCEI-compliant labour estimates, and a single-click priced report ready for submission.

## Who it's for

Professional contractors — civil, residential, light commercial — who need:

- A defensible **material cost matrix** spanning Builders Warehouse, Cashbuild, Leroy Merlin, BUCO, and Build it
- **BCCEI-compliant labour rates** that survive a Department of Employment and Labour audit
- A repeatable workflow from BoQ in → priced Excel out, without re-keying line items five times

## What it does

| Capability | Surface |
|------------|---------|
| BoQ ingestion (Excel / PDF / image) | `src/app/api/analyze` — DeepSeek-extracted line items, preserved descriptions, fixed 8-category taxonomy |
| Live price comparison | `src/app/api/prices/compare` — Browserbase-scraped HTML → DeepSeek structured extraction, 5-store symmetric matrix |
| Batch BoQ pricing | `src/app/api/prices/boq-batch` — parallel resolution against market knowledge + AI estimator with disk-backed cache |
| BCCEI labour pricing | `src/lib/bccei/labour.ts` — 2025/2026 Task Grade table, category → grade defaults, audit trace per line item |
| Tender-grade Excel export | "Download Sourcing File" / "Save Report" — 13-column matrix with executive summary in rows 1–5 |

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind v4**
- **Supabase** (auth via `@supabase/ssr`, Postgres with RLS)
- **DeepSeek** as canonical LLM, accessed via the OpenAI-compatible SDK; **Groq** kept as a graceful fallback only
- **Browserbase** (cloud headless Chromium) for retail price scraping, fronted by the `scraper/` Python microservice
- **`xlsx`** for sourcing-file generation, **`jspdf`** for printable summaries

Removed in the tender-pivot refactor: standalone Python `backend/`, ChromaDB RAG, Google Gemini, direct OpenAI API usage, the AI Concierge chatbot, and WhatsApp share buttons.

## Getting started

```bash
cp .env.example .env.local
# Set DEEPSEEK_API_KEY (required), BROWSERBASE_API_KEY (live pricing),
# and NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY (auth + project storage).

npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and sign in. A demo BoQ lives in the repo root (`builders.html`, `cashbuild.html` capture corpus).

### Running the scraper microservice

The Next.js routes call `scraper/main.py` (default port 8001) for live HTML. To run it locally:

```bash
cd scraper
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
playwright install chromium  # only the first time
uvicorn scraper.main:app --port 8001
```

Set `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` in `.env.local` to use cloud headless Chromium instead of the local browser — strongly recommended for parallel scraping load.

## Project conventions

- Provider chain is mandatory: every AI call site must try **DeepSeek → Groq → throw**. Never silently swallow a provider failure.
- The 5-supplier matrix is symmetric. A failed store returns `N/A` — never mirror another store's value.
- Labour estimates resolve only through `src/lib/bccei/labour.ts` so each figure is traceable to a published BCCEI Task Grade.
- Typography is contractor-friendly: no `font-light` / `font-thin` anywhere. Minimum weight is `font-medium`.

Full rules: [`.agent/rules/team_standards.md`](.agent/rules/team_standards.md).
Tender-pivot history and milestones: [`.agent/tender_pivot_plan.md`](.agent/tender_pivot_plan.md).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm test` | Jest test suite |
| `npm run lint` | ESLint |

## Compliance notes

- BCCEI wage figures encoded in `src/lib/bccei/wages.ts` are sourced from the BCCEI Industry Circular dated 08 August 2025. They are subject to ministerial promulgation. The UI surfaces this caveat alongside every labour estimate.
- POPIA notes: [`POPIA_COMPLIANCE.md`](POPIA_COMPLIANCE.md).
- Deployment guide: [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md).

## License

Private. All rights reserved.
