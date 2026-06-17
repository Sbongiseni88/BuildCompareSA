---
trigger: always_on
---

# Team Standards & Rules

## Communication
- **Check `/devs` First**: Agents must check the `/devs` folder for updates from other agents before starting a subtask.
- **Artifact Updates**: When completing a task, update the relevant technical document in `/devs` if implementation details changed.

## Code Consistency

### Backend / API (TypeScript)
- All orchestration logic lives in the Next.js 16 API route pipeline (`src/app/api/`).
- The standalone Python `backend/` folder has been **deleted** (deprecated as of the tender-pivot refactor). Calculators live in `src/lib/calculations.ts`.
- The only surviving Python service is `scraper/` — it runs Playwright over Browserbase CDP and is treated as a black-box microservice. Do not add new business logic to it; treat it strictly as an HTML-fetcher.
- Use explicit TypeScript types; validate every external/AI payload before trusting it.

### Frontend (TypeScript / React)
- All styling must use **Tailwind utility classes**.
- Avoid custom CSS unless absolutely necessary (use `devs/frontend_dev.md` for design system reference).
- Never use `font-light` / `font-thin`. The primary user persona is contractors aged 40–55 — typography must be high-contrast and ≥ font-medium.

## Conflict Resolution
- **File Locking**: If a file you need to edit is currently being modified by another task, pause and notify the user via an Artifact.
- **Resolution**: Wait for user instruction or for the blocking task to complete.

## AI / Data Provider Standard

| Role | Provider | Notes |
|------|----------|-------|
| Primary LLM | **DeepSeek** (`deepseek-chat`) via OpenAI-compatible API | Canonical for chat, BoQ extraction, price parsing, and quote normalization. Transport is the `openai` npm package — that is DeepSeek's standard SDK. |
| Fallback LLM | **Groq** (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) | Used only when DeepSeek returns an error or its key is missing. Never invoked in front of DeepSeek. |
| Web scraping | **Browserbase** via Playwright CDP, fronted by `scraper/main.py` | Fetches raw HTML structural strings only. No extraction logic in the scraper. |
| Forbidden | Google Gemini (`@google/generative-ai`), direct OpenAI API calls, Anthropic | Do not re-introduce. The OpenAI npm package is kept solely as the DeepSeek transport. |

Every AI call site must implement the chain: `DeepSeek → Groq fallback → throw "no provider available"`. Never silently swallow a provider failure.

## Excel / report export
Reports are tender-grade B2B sourcing files. The column set is fixed:

`Item Ref | Material Description | Category | Qty | Unit | Builders Warehouse | Cashbuild | Leroy Merlin | BUCO | Build it | Voltex | ABB | Cheapest Supplier | Cheapest Price (ZAR) | Labour Estimate (ZAR)`

Voltex and ABB are electrical-specialist suppliers — they quote only on `Electrical` line items and report `N/A` on all other categories.

The cheapest supplier cell is prefixed with `⭐ ` (star + space). The project summary block (Grand Total, Total Labour, Total Materials, generated date) lives in rows 1–5 — never at the bottom. The download button reads **"Download Sourcing File"** in PriceSearchHub and **"Save Report"** in ProjectsManager. Never label it "Export Excel".

## BCCEI labour standard
Every line-item labour estimate must resolve through `src/lib/bccei/labour.ts` so the figure is traceable to a published BCCEI Task Grade. The encoded table in `src/lib/bccei/wages.ts` is the only place wage values live; if the Minister promulgates a new circular, edit that file and nowhere else.

## Retail matrix invariant
The seven-store supplier matrix (Builders Warehouse, Cashbuild, Leroy Merlin, BUCO, Build it, Voltex, ABB) is symmetric. A failed lookup returns `{ priceZar: null, status: 'N/A', reason }` — **never** falls back to mirroring another store's value. See `.agent/skills/retail_matrix_normalization/SKILL.md`.
