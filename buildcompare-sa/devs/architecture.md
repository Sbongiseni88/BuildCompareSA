# BuildCompare SA: Unified AI/Backend Architecture

## Current State: Who Calls What

### Frontend Components → Next.js API Routes (the LIVE paths)

| Component | Calls | Method |
|-----------|-------|--------|
| `AIConcierge.tsx` | `/api/chat` | POST |
| `SmartEstimator.tsx` | `/api/v1/estimator/boq` | POST |
| `PriceSearchHub.tsx` | `/api/prices/compare` | GET |
| `VisualSearch.tsx` | `/api/analyze` | POST |

### Next.js API Routes

| Route | Proxies to Python? | Status |
|-------|---------------------|--------|
| `/api/chat` | Yes (scraper for tool calls) | **ACTIVE** |
| `/api/analyze` | No (self-contained DeepSeek) | **ACTIVE** |
| `/api/prices/compare` | Yes (scraper fallback) | **ACTIVE** |
| `/api/v1/estimator/boq` | No (self-contained DeepSeek) | **ACTIVE** |

*Note: Legacy duplicate routes (`/api/estimate`, `/api/prices/live`, `/api/boq/process`) were removed to unify the architecture.*

### Python Backend Endpoints (FastAPI on port 8000)

| Endpoint | Called by? | Status |
|----------|-----------|--------|
| `GET /` | Nobody (info) | Ops utility — ACTIVE |
| `GET /health` | Monitoring | Ops utility — ACTIVE |
| `GET /ready` | Orchestrator | Ops utility — ACTIVE |

*Note: Legacy Python business routers (`prices`, `estimator`, `ocr`) have been explicitly deprecated. All UI business logic now lives in the Next.js API layer.*

### Python Scraper Microservice (port 8001, `scraper/main.py`)

| Endpoint | Called by? | Status |
|----------|-----------|--------|
| `GET /scrape` | `/api/chat`, `/api/prices/compare` | **ACTIVE** (via proxy) |

## Final Architecture Decisions

### Layer 1 — Next.js API Routes (Authoritative for UI)
All UI-facing business logic runs in Next.js API routes. These are the **authoritative** endpoints for chat, BoQ analysis, generation, and price comparisons.

### Layer 2 — Python Scraper Microservice (Tool Service)
The `scraper/main.py` provides Playwright-based web scraping as a tool for Next.js routes. It is NOT called directly by the frontend.

### Layer 3 — Python Backend (`backend/`) — Deprecated/Utility
The FastAPI backend at `backend/main.py` previously duplicated capabilities already handled by Next.js routes. The UI never calls it directly. Its RAG, estimator, OCR, prices, and calc endpoints are treated as dead code or internal-only utilities. The active endpoints are strictly for health/readiness monitoring.

## Scraping Strategy

### Current Model: Self-Hosted Playwright Microservice
The scraper (`scraper/main.py`) runs as a standalone FastAPI service using Playwright for headless browser scraping. Next.js API routes proxy to it when live pricing data is needed.

**Environment contract:**
- A single env var `SCRAPER_URL` is used by all Next.js routes that need scraping.
- Default value: `http://127.0.0.1:8001`
- The scraper listens on port 8001 (`uvicorn main:app --port 8001`).

**Deployment model:**
- **Local dev**: Run `cd scraper && uvicorn main:app --port 8001` alongside `npm run dev`.
- **Production (Vercel + sidecar)**: Deploy the scraper to a persistent host (e.g., Railway, Fly.io, or a VPS). Set `SCRAPER_URL` in Vercel env to point to the deployed scraper.

### Browserbase: Adopted for Cloud Scraping
Browserbase has been fully integrated into the scraper microservice (`scraper/main.py`). The scraper now connects to Browserbase's cloud infrastructure via CDP (`connect_over_cdp`), rather than launching Chromium locally.

**Why Browserbase?**
1. It eliminates the need to run and manage headless Chromium instances locally or in Vercel/ECS.
2. It provides built-in proxy rotation and CAPTCHA handling for retailer websites that block basic bots.
3. It offers session recording and live debugging capabilities.

**Configuration:**
Requires `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` in the environment.
