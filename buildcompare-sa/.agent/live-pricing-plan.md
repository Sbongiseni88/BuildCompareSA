# Live Pricing Plan — replacing synthetic prices with real scraped data

**Status:** NOT STARTED. This is the plan for the "real accuracy" step deferred
from the category/description fix.

## The problem this solves

Today the BoQ price matrix is **synthetic**. `src/lib/batch-price-resolver.ts`
takes one market-knowledge base price per item and multiplies it by a *fixed*
per-store factor (`pricePosition` in `src/data/sa-market-knowledge.ts`). Because
that factor is constant across all items, **one store (Cashbuild, position −0.2)
is mathematically the cheapest for every line, forever.** No tweak to the
multipliers fixes this — the prices simply aren't real.

The live `scraper/main.py` (Browserbase + Playwright) already exists and already
knows all five store search URLs (builders, cashbuild, leroy_merlin, buco,
buildit) — but nothing in the Next.js pricing path calls it.

## Target architecture (matches `production_plan.md`)

```
PriceSearchHub → /api/prices/boq-batch
  → for each material:
      → scraper GET /scrape?store=<s>&query=<desc>   (5 stores, parallel)
      → raw HTML per store
      → DeepSeek extract  → { store, price, inStock, productUrl }
      → assemble RetailMatrix (real price per column, N/A on failure)
  → cache (Supabase or .next cache, keyed by normalized desc + store, ~2h TTL)
```

## Step-by-step

1. **Scraper endpoint.** Confirm/extend `scraper/main.py` exposes
   `GET /scrape?store=&query=&region=` returning `{ store, html, status }`.
   Add `/uptime` ping to avoid cold starts. Deploy (Dockerfile + deploy.sh exist).
   Set `BROWSERBASE_API_KEY` / `BROWSERBASE_PROJECT_ID` + `SCRAPER_BASE_URL`.

2. **New module `src/lib/live-pricing.ts`.**
   - `scrapeStore(store, query)` → calls scraper, returns raw HTML (or N/A).
   - `extractPriceFromHtml(html, query)` → DeepSeek call, strict
     `response_format: json_object`, returns `{ priceZar, inStock, productUrl }`.
     Reuse `getDeepseekClient()`. One item per call, OR batch a store's grid.
   - Per-store failure → `{ status: 'N/A', reason }`. **Never** mirror another
     store (this is the existing `retail-matrix.ts` invariant — reuse `blankMatrix`,
     `assertSymmetric`, `logMatrixNa`).

3. **Caching.** Key = `normalizeMaterialName(desc)` + store + region. TTL ~2h.
   Start with the existing `.next/cache` file pattern in `batch-price-resolver.ts`,
   or promote to a Supabase `price_cache` table for cross-instance reuse.

4. **Wire into `resolveBatchPrices`.** Replace `resolveFromKnowledge`'s synthetic
   quote generation with: cache → live scrape+extract → (last resort) the current
   market-knowledge estimate **explicitly flagged `confidence: 'low'` + `isEstimate: true`**.
   Keep the BCCEI labour + tenderCategory logic exactly as-is (already correct).

5. **Honesty in UI.** When a row falls back to an estimate, keep the per-item
   `ESTIMATE` badge (already in PriceSearchHub) and suppress/relabel the big
   "Potential Savings" headline so estimated savings aren't presented as real.

6. **Tests.**
   - `live-pricing.test.ts`: mock scraper HTML + mock DeepSeek → asserts a real
     per-store matrix, and that a downed store yields `N/A` (not mirrored).
   - Anti-bias assertion: feed 5 items, confirm the cheapest store is **not**
     identical across all of them when prices differ.

## Acceptance
- A 5-line BoQ shows genuinely different cheapest suppliers across lines.
- A deliberately-failed store shows `N/A`, others still populate.
- Every price traces to either a live scrape (high confidence) or a clearly
  labelled estimate (low confidence).

## Risks
- BUCO / Build it search markup is undocumented; selectors will need a real-run
  tuning pass (already flagged in `tender_pivot_plan.md`).
- DeepSeek extraction cost per item — batch per store grid and cache aggressively.
- Browserbase concurrency / cold-start latency for large BoQs (chunk + cache).
