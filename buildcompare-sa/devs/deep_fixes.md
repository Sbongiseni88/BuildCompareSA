# BuildCompare SA — Deep Architecture Fixes Tracker

> Created: 2026-04-10
> Status: IN PROGRESS

---

## Fix Checklist

### Priority 1: Core Functionality

- [x] **Fix A: Implement Real Scrapers** ✅
  - Files: `backend/services/scraper.py`
  - Change: Replace mock `random.uniform()` stubs with real HTTP requests using `httpx` + BeautifulSoup for Builders, Cashbuild, and Leroy Merlin. Add retry logic, timeouts, and graceful fallback.
  - Impact: Core value prop — live SA building material prices instead of random numbers

- [x] **Fix B: AI Concierge Conversation Memory** ✅
  - Files: `src/components/AIConcierge.tsx`, `src/app/api/chat/route.ts`
  - Change: Send full conversation history (not just latest message) to Groq. Enrich system prompt with SA construction context. Upgrade RAG model from 8B to 70B.
  - Impact: AI gives contextual, high-value responses instead of stateless one-shot answers

### Priority 2: Missing Pipelines

- [x] **Fix C: Unified OCR Pipeline (Groq Vision)** ✅
  - Files: `backend/services/ocr_service.py`, `backend/routers/ocr.py`
  - Change: Replace Tesseract/hardcoded fallback with Groq Vision API (Llama 4 Scout). Parse OCR output into structured Material[] JSON.
  - Impact: BoQ scanning actually works — handwritten and printed documents

### Priority 3: Production Hardening

- [x] **Fix D: Health Check + Environment Validation** ✅
  - Files: `backend/main.py`
  - Change: Add `/health` endpoint, validate required env vars at startup (fail fast), add startup banner with config status.
  - Impact: Load balancers can probe the app; missing config caught immediately instead of runtime crashes

- [x] **Fix E: Structured Logging + Error Tracking** ✅
  - Files: `backend/main.py`, `backend/services/*.py`
  - Change: Replace all `print()`/`console.error()` with Python `structlog` structured JSON logging. Add request ID middleware for tracing.
  - Impact: Actionable logs instead of unstructured console output; each request traceable end-to-end

---

## Implementation Log

| Fix | Status | Notes |
|-----|--------|-------|
| Fix A: Real Scrapers | ✅ Done | Real httpx requests to all 3 retailers, BeautifulSoup HTML parsing, JSON-LD support for Leroy Merlin, retry logic with backoff, deterministic fallback catalog for 10 material categories |
