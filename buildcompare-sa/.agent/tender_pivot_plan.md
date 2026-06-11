# BuildCompareSA — Tender Pivot Master Plan

**Owner:** Refactor agent
**Date authored:** 2026-06-09
**Mode:** Strict-autonomy execution after this plan is committed.
**Source-of-truth for AI/data canon:** `.agent/rules/team_standards.md`

## Pivot summary

BuildCompareSA is being repositioned from a retail-consumer price-comparison app to a **B2B SaaS for South African contractors bidding on government tenders**. The work is split into five milestones plus a Phase 0 skill-setup pass and a closing validation gate.

## Confirmed decisions (from clarifying round)

| Q | Decision |
|---|---|
| 1. BCCEI source | BCCEI Circular Negotiations, 08 Aug 2025 (pdf). Wage table parsed, encoded into `src/lib/bccei/wages.ts`. |
| 2. Browserbase migration scope | Keep `scraper/` as the single surviving Python microservice (it already runs Playwright over Browserbase CDP). Only `backend/` is deleted. |
| 3. OpenAI SDK | Keep `openai` npm — it is the standard transport for the DeepSeek OpenAI-compatible API. Remove only direct OpenAI API usage. |
| 4. BUCO + Build it scrapers | Build from scratch as best-effort; may need real-world tuning. |
| 5. `backend/` deletion | Confirmed delete. Calculators ported to TS. ChromaDB / RAG dropped. OCR temporarily dropped until vision is wired. |
| 6. `.agent/rules/team_standards.md` | Exists. Update its "AI provider standard" line. |
| 7. Skills location | Project-scoped `.agent/skills/`, not user-global. |
| 8. Groq | Kept as fallback alternative behind DeepSeek. Gemini scrubbed. |

## Tooling / skills (Phase 0)

Three deterministic project-scoped skills live under `.agent/skills/`:

1. **`boq_regex_structural_parser`** — regex + DeepSeek prompt scaffold that pulls *Item Ref / Description / Unit / Qty* without collapsing rows into "other". Used by `src/lib/boq-engine.ts`.
2. **`bccei_gazette_labor_mapper`** — encodes the 2025/2026 BCCEI Task Grade table + allowances, plus the BoQ-category → task-grade defaults. Used by `src/lib/bccei/labour.ts`.
3. **`retail_matrix_normalization`** — invariants that every store column (Builders / Cashbuild / Leroy Merlin / BUCO / Build it) is populated independently or returns `N/A`. Used to assert against single-supplier bias.

Each skill is invocable by a future agent via `Skill { skill: '<name>' }`.

---

## Milestone 1 — Architectural sanitization

### Steps
1. **Delete `backend/`** entirely. Confirm nothing in Next.js still references it (env, fetch URLs, README).
2. **Delete `chroma_db/`** and **`backend.pid`, `frontend.pid`, `uvicorn.log`** stray runtime artefacts.
3. **Port Python calculators** (`backend/calculations.py`) → `src/lib/calculations.ts`. Keep functions: `calculateBricksNeeded`, `calculatePaintLitres`, `calculateRoofTiles`.
4. **Remove `@google/generative-ai`** import sites and the package itself.
5. **Keep `groq-sdk`** and `src/lib/groq.ts` for fallback path only; gate every call behind a `DEEPSEEK → GROQ → throw` chain.
6. **Keep `openai` npm** — only used by `src/lib/deepseek.ts`.
7. **`.agent/rules/team_standards.md`** — replace the deprecated-backend bullet with current architecture; update AI provider standard to: DeepSeek canonical, Groq fallback.
8. **`README.md`** — full rewrite removing Next.js boilerplate; introduce the B2B tender-bidding pitch, stack, dev quickstart.

### Acceptance
- `rg -i "GROQ_API_KEY|groq-sdk"` returns only fallback paths.
- `rg -i "@google/generative-ai|gemini"` returns 0 in `src/`.
- `rg "backend/"` returns 0 hits outside `.gitignore`.
- `npm run build` passes.

---

## Milestone 5 — BCCEI labour pricing integration (done before M3/M4 because M3 categories feed M5 lookups, and M4 exports the result)

### BCCEI 2025/2026 wage data (verified from circular dated 08 Aug 2025)

Hourly rate (ZAR), by Task Grade:

| Grade | Y1 (to 31 Aug 2026, +6%) | Y2 (1 Sep 2026 → 31 Aug 2027, +5.5%) | Y3 (1 Sep 2027 → 31 Aug 2028, +5.5%) |
|---|---|---|---|
| 1 | 54.06 | 57.03 | 60.17 |
| 2 | 55.32 | 58.36 | 61.57 |
| 3 | 56.87 | 60.00 | 63.30 |
| 4 | 59.00 | 62.24 | 65.67 |
| 5 | 66.80 | 70.48 | 74.35 |
| 6 | 75.86 | 80.04 | 84.44 |
| 7 | 86.89 | 91.67 | 96.71 |
| 8 | 97.42 | 102.78 | 108.44 |
| 9 | 110.11 | 116.17 | 122.56 |

Allowances:
- Living Out (per assignment day): R1 600 / R1 700 / R1 800
- Sleep Out (per night): R246.95 / R276.95 / R306.95
- Cross-border: 7% of basic rate
- Acting: 5% of basic rate

**Caveat to surface in UI:** Wage values are subject to ministerial promulgation. We display the published circular rates as defaults; contractors should override if their site agreement supersedes.

### Default BoQ-category → Task-grade mapping (opinionated defaults, editable)

| Category | Task Grade | Hours per unit (default) |
|---|---|---|
| Preliminaries | 3 | 0.5 / unit |
| Concrete | 4 | 1.2 / m³ |
| Masonry | 5 | 1.5 / m² |
| Finishes | 5 | 1.0 / m² |
| Plumbing | 6 | 0.8 / point |
| Openings | 6 | 1.5 / unit |
| Electrical | 7 | 0.8 / point |
| Structural Steel | 7 | 0.6 / kg / 100 |

These are starting defaults — every value is documented and overridable in `src/lib/bccei/labour-defaults.ts`.

### Files
- `src/lib/bccei/wages.ts` — typed wage table + helper `currentYear(today)` resolving to Y1/Y2/Y3.
- `src/lib/bccei/labour-defaults.ts` — category map and labour-hours-per-unit.
- `src/lib/bccei/labour.ts` — `estimateLabour({ category, qty, unit }) → { grade, hours, rate, total, currency, basis }`.
- `src/lib/bccei/__tests__/labour.test.ts` — unit tests covering all 8 categories.

### Acceptance
- Each line item's labour estimate is fully traceable to a published BCCEI grade.
- Year switchover at 1 Sep 2026 is automatic from `currentYear()`.
- Unit tests pass.

---

## Milestone 3 — BoQ engine + scraper bias fix

### BoQ extraction
- DeepSeek prompt rewritten: extract `item_ref`, `description` (must be the literal material string, never an index number), `unit`, `qty`, `category` (one of 8 fixed values).
- Validation layer rejects any row where `description` equals or starts with the `item_ref`, or where `category === 'other'`.
- Regex fallback (`src/lib/boq-engine.ts` heuristics) updated to the same 8-category set.

### Five-store matrix
- `STORE_URLS` extended in `scraper/main.py`:
  - `builders` (existing)
  - `cashbuild` (existing)
  - `leroy_merlin` (existing)
  - `buco` — `https://www.buco.co.za/search?q={query}`
  - `buildit` — `https://buildit.co.za/?s={query}`
- Per-store async fetch fans out in parallel; per-store failure resolves to `{ price: null, status: 'N/A', reason: string }` — **never** mirrors another store's value.
- `src/lib/batch-price-resolver.ts` enforces "all 5 columns present" invariant before returning.
- Defensive logging when any store returns N/A so anti-bias regressions are visible.

### Acceptance
- `boq-engine.test.ts`: extraction never produces "other"; descriptions are real strings.
- `batch-price-resolver.test.ts`: with one supplier deliberately down, the others still report independent values and the down supplier reports `N/A`.

---

## Milestone 4 — Excel export restructure (`src/lib/pdfExport.ts` / xlsx writer)

### Final column layout
```
Item Ref | Material Description | Category | Qty | Unit |
Builders Warehouse | Cashbuild | Leroy Merlin | BUCO | Build it |
Cheapest Supplier | Cheapest Price (ZAR) | Labour Estimate (ZAR)
```

### Removed columns
- `Total Cost`
- `Potential Savings`
- `Detailed Technical Specification`

### Top dashboard block (rows 1–5)
- Row 1: Project name
- Row 2: Grand Total (materials + labour)
- Row 3: Total Labour
- Row 4: Total Materials
- Row 5: Generated date + BCCEI year basis

### Formatting
- `Cheapest Supplier` cell prefixed with `⭐ ` (star + space) and bold.
- Light header fill, frozen top 6 rows, autosize columns.
- Button copy: **"Download Sourcing File"** in `PriceSearchHub.tsx`, **"Save Report"** in `ProjectsManager.tsx`.

### Acceptance
- Snapshot test against a 5-line BoQ.
- File opens cleanly in LibreOffice / Excel.

---

## Milestone 2 — UI/UX repair (last because supplier matrix + labour data feed the views)

### Loading-stall diagnosis
1. **Dashboard** — audit data-fetch hooks; introduce `<Suspense>` around the project/savings/stats fetch; ensure Supabase queries are memoised so the route doesn't re-fetch on every navigation.
2. **Account** — likely `useAuthContext` hangs when session expires silently. Add timeout + fallback UI.
3. **Projects Hub** — RLS query likely returns `null` mid-handshake. Distinguish "loading" from "no projects" so the skeleton resolves.

### Navigation polish
- Sidebar focus ring, breadcrumb font-weight ≥ 600.
- Replace any `font-light` / `font-thin` Tailwind utilities globally.
- Tap targets ≥ 44 px (already mostly satisfied).
- Transition durations capped at 200 ms.

### PriceSearchHub → ProjectsManager save flow
- After a batch BoQ resolution, expose **"Save to Project"** primary action.
- Modal lists active projects; selection writes the priced basket as a `materials[]` payload on the project row.

### SmartEstimator simplification
- Remove the multi-step wizard; collapse to a single panel with a template dropdown ("Boundary wall", "Slab", "Roof framing", custom) + inputs.
- Calculate inline; one button → priced output.

### Removals
- Delete `src/components/AIConcierge.tsx`.
- Remove every import / state / button reference (`isConciergeOpen`, `MessageSquare` "Ask AI" button, `onSearchAction`).
- Strip "Share to WhatsApp" handlers and buttons site-wide.

### Acceptance
- Dashboard renders within 1 paint on a cold load with throttled-3G dev tools simulation.
- No `font-light` / `font-thin` in `src/**`.
- AIConcierge import count: 0.

---

## Validation gate

1. `npm run lint` — clean.
2. `npx tsc --noEmit` — clean.
3. `npm run build` — passes.
4. `npm test` — all suites green.
5. Manual smoke: load `/`, navigate dashboard → estimator → search → projects, run a 3-line BoQ, click "Download Sourcing File", confirm columns + top summary.

## Out of scope (deferred — explicitly *not* shipped in this pass)

- Real OCR replacement for the deleted Python service.
- Stripe / paid plans.
- Server-side caching beyond the existing pricing cache.
- Email delivery of reports.
- Multi-tenant org model.

## Risks I'm carrying

- BUCO and Build it scrapers may need URL-shape tweaks after first real run; both stores' search markup is undocumented here. Acceptable per Q4.
- BCCEI Task Grade → BoQ-category mapping is opinionated; documented defaults are editable.
- Removing AIConcierge removes a piece the user previously valued — confirmed in original prompt.

---

## Execution log — verification & gap-closure pass (2026-06-10)

A full re-verification of every milestone against its acceptance criteria,
followed by closure of all gaps found. Validation gate: `npm run lint` ✅ (0
errors), `npx tsc --noEmit` ✅, `npm run build` ✅, `npm test` ✅ (8 suites,
87 tests).

### Verified already complete (no changes needed)
- **M1**: `backend/` + artefacts deleted; calculators in `src/lib/calculations.ts`;
  `@google/generative-ai` uninstalled; README + team_standards rewritten.
- **M2**: zero `font-light`/`font-thin`; AIConcierge + WhatsApp gone; Dashboard
  skeletons + 8s failsafe; ProjectsManager loading/error/empty distinction;
  Save-to-Project modal in PriceSearchHub; single-panel SmartEstimator.
- **M3 (partial)**: 5-store `STORE_URLS` in scraper; `retail-matrix.ts`
  symmetry/N-A invariants; `tender-categories.ts` 8-category classifier.
- **M4 (BCCEI)**: wage matrix matches the circular exactly; `currentWageYear()`
  switches automatically; allowances encoded; labour tests pass.
- **M5**: 13-column sourcing file, ⭐ prefix, rows 1–5 dashboard,
  "Download Sourcing File" copy.

### Gaps found & closed in this pass
1. **`'other'` still reachable** — `guessCategory()` legacy fallback,
   `analyze` route `|| 'other'`, scraper `guess_cat`, and the DeepSeek prompt
   itself offered "other". All rewritten: prompts mandate the 8 BCCEI
   categories; `Material.tenderCategory` added and threaded through
   `boq-engine` → `sourcing-file`/`batch-price-resolver` (explicit pipeline
   value wins). New `materialsFromParsedRows()` enforces the integrity
   contract (drops ref-mirroring rows, reclassifies junk categories, labour
   via BCCEI estimator). 15 new tests in `boq-tender-contract.test.ts`.
2. **Provider chain hole** — `/api/analyze` had no Groq fallback (dead Groq
   model lists left over). Now DeepSeek → Groq → throw, per standards; ~140
   lines of helpers deduplicated into `boq-engine`. 15 MB upload cap added.
3. **CI would fail post-commit** — backend job in `ci.yml` referenced the
   deleted `backend/`; removed, typecheck step added to the frontend job.
4. **Stale docs** — Gemini/`backend/` references scrubbed from
   DEPLOYMENT_GUIDE, DEPLOYMENT_READINESS, POPIA_COMPLIANCE,
   TECHNICAL_SPEC, devs/architecture; PROJECT_HANDOFF rewritten; historical
   banners on devs fix-logs; `.env.example` synced (added `LOCAL_SCRAPER_URL`,
   `BOQ_PARSER_URL`; dropped unused reCAPTCHA + server-side Supabase vars).
5. **Sanitization leftovers** — hardcoded Supabase anon-key fallbacks removed
   from `query_supabase.py`/`test_supabase.py` (rotate if repo goes public —
   key remains in git history); deprecated firebase stubs deleted; stale
   `AISuggestion`/`ChatMessage` types removed; Browserbase project-id no
   longer logged; silent `except: pass` in `boq_parser.py` now logs.
6. **Hardcoded parser URL** — `/api/boq/process` now resolves
   `BOQ_PARSER_URL → LOCAL_SCRAPER_URL → 127.0.0.1:8001`.
7. **UI copy + a11y** — ProjectsManager "Export PDF" → "Save Report"; header
   tap targets ≥44 px; three React-compiler errors fixed (impure
   `Date.now()` in NotificationCenter render, sync setState in
   PWAInstallPrompt effect, use-before-declare in Toast); JSX apostrophes
   escaped; ESLint now ignores venv/.swc artefacts and treats
   `no-explicit-any` as a warning at LLM boundaries (documented policy).

### Still open (carried to next pass)
- Server-side auth on API routes (top June-2026 audit finding).
- `xlsx` package replacement (unfixed upstream CVEs) + `npm audit fix` for jsPDF.
- Distributed rate limiting; BUCO/Build it scraper selector tuning.
---

## Execution log — 2026-06-11 master refactor (B2B Tender Pricing Roadmap)

Save point: `e520b0a` (price_cache pipeline). Work below implements the
5-milestone master prompt; previously-shipped items were verified, not rebuilt.

### M1 — Intelligent P&G Calculator & bias resolution
- **`src/lib/pg-services.ts` (new):** virtualized B2B site-operational service
  rate book (site office, storage, chemical toilets, scaffolding, shoring,
  H&S officer, fencing, security, temp services, supervision). Each estimate
  carries a basis string labelling it an indicative service rate — never a
  retail price, never fed into the 5-store matrix.
- **`spreadPgBalance()`** — percentage-based P&G spread tool: distributes a
  total P&G balance across material rows proportional to value, reconciling
  rounding drift to the cent (largest-row remainder).
- **`batch-price-resolver.ts`:** `buildNoRetailResult()` now attaches
  `pgService` for Preliminaries lines. SCRAPER INVARIANT preserved: the
  retail matrix on these rows stays all-N/A (`not_attempted`); regression
  test extended in `boq-engine.test.ts`.
- Verified (pre-existing): Preliminaries/structural bypass, no fabricated
  spreads, warm price_cache phase.

### M2 — Tender-ready compliance dashboard
- **`src/lib/cidb.ts` (new):** grading designations (1–9 × GB/CE/EB/EP/ME/SO),
  Reg-25 tender value limits, `checkCidbCompliance()` flags over-limit BoQs.
- **`AccountProfile.tsx`:** CIDB Grading preset (grade + class selects) saved
  to `profiles.cidb_grading`; degrades gracefully when the migration is
  missing. Migration: **`supabase/profile_cidb.sql`** (idempotent, format check).
- **`PriceSearchHub.tsx`:** compliance banner after each priced BoQ —
  red flag when materials-only value exceeds the grade limit.
- **`src/lib/sans-compliance.ts` (new):** deterministic SANS/SABS keyword
  cross-reference (SANS 10400 parts, SANS 50197-1, 920, 10142-1, …) → "SABS
  Approved Material Required" badge on result cards. Deliberately NOT an LLM
  call (badges must be reproducible). Parser prompt (`scraper/boq_parser.py`)
  rule 9 now preserves SANS/SABS references verbatim in `specs`.
- Verified (pre-existing): "Material Only: 0" fix — Preliminaries cards show
  "P&G Allowance"; panel re-badged "Site Operations / Service Fee" and now
  renders the pgService estimate.

### M3 — Localized geo-logistics & basket-splitting
- **`src/lib/landed-cost.ts` (new):** Landed Site Cost = shelf total + base
  delivery + heavy-mass surcharge (Concrete/Masonry/Structural Steel, capped)
  + distance leg beyond 10 km. `crownCheapestByLandedCost()` ranks quotes on
  that total. Both search paths in PriceSearchHub now crown "Best Landed
  Cost" instead of shelf price; cards show the landed breakdown with basis.
- **`ProjectsManager.tsx`:** project location field relabelled **Site
  Delivery Destination** (Springs/Welkom placeholder + helper copy). Honest
  limitation: store distances are chain-level/geo-radius based — no
  branch-level geocoding data exists, so nothing pretends otherwise.

### M4 — B2B monetization & spreadsheet exports
- **`sourcing-file.ts`:** `markupPercent` option → second sheet **"Tender
  Rates"**: sheet 1 keeps RAW data byte-identical (test-asserted); sheet 2
  carries cost rates, marked-up unit rates, line totals, and a margin
  summary that reconciles exactly.
- **`PriceSearchHub.tsx`:** CIDB Margin slider (0–30 %, session-persisted)
  drives the export; **Bulk Supplier RFQ** button generates a formal PDF
  (**`src/lib/rfq-pdf.ts`**, new) with blank price columns for the supplier —
  our price intel never leaks into the RFQ.
- Verified (pre-existing): button copy already "Download Sourcing File" /
  "Save Report"; no "Export Excel"/CSV strings remain.

### M5 — Frontend performance & navigation repair (verified)
- Dashboard cache (`dashboard-cache.ts`, 5-min staleTime, synchronous hydrate,
  skip-fetch-when-fresh) — in place.
- Toolbars: `flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch
  sm:items-center`, h-11/h-12 (≥44 px) — in place; new banner controls follow
  the same pattern.
- No `alert()` calls anywhere in `src`; SANS 10400 / BCCEI guides route to
  `ComplianceGuideOverlay` slide-overs.

### Validation
- jest: **14 suites / 184 tests passing** (55 new: cidb, sans-compliance,
  pg-services, landed-cost, Tender Rates sheet, pgService regression).
- `tsc --noEmit`: clean. ESLint: 0 errors. `next build`: clean.

### Activation checklist
1. Run `supabase/profile_cidb.sql` in the Supabase SQL editor.
2. (Pipeline, from save point) run `supabase/price_cache.sql` + add repo
   secrets, then dry-run the Price Pipeline workflow.

---

## Execution log — 2026-06-11 override pass (consumer-element purge & fabrication kill)

User reported the legacy AI Concierge / fabricated Cashbuild spreads "back".
Forensic finding: NO rollback existed in git — AIConcierge was deleted in
c3aeb1c and absent at HEAD; zero WhatsApp/wa.me/742.35 references in src.
The legacy UI was served by a STALE PWA CACHE: public/sw.js pinned
CACHE_NAME 'buildcompare-v1' since the consumer era, so installed clients
kept the pre-pivot bundle.

### Fixes
1. **sw.js:** CACHE_NAME bumped to 'buildcompare-v2-tender' (+ comment
   mandating a bump per shell release). skipWaiting/clients.claim already
   present — old caches purge on next load.
2. **Fabricated spreads eliminated at the source (resolver):**
   - `resolveFromKnowledge()` no longer multiplies the knowledge midpoint by
     per-store `pricePosition` (the deterministic "Cashbuild always wins"
     curve). It now returns ONE `indicativeEstimateZar` + `estimateBasis`,
     quotes empty, matrix all-N/A.
   - `batchAIEstimate()` prompt rewritten: ONE `typicalPrice` per item —
     the LLM is never again asked to invent a 5-store comparison. AI cache
     format migrated (old spread-bearing entries dropped on load).
   - stats.aiEstimated now counts indicative estimates.
   - Store columns can ONLY be populated by price_cache hits (real
     pipeline-scraped rows) or live scrapes. Un-scraped store = N/A, never
     mirrored.
3. **Compare API route:** deleted dead `generateMarketEstimates()` (the
   curve generator); replaced `generateAIEstimate()` (5-store LLM spread)
   with `generateIndicativeEstimate()` (single figure); added STEP 3b —
   warm price_cache read serving real per-store quotes (source
   'cached-scrape', priceConfidence high) before any estimate fallback.
4. **PriceSearchHub:** three honest no-quote panels — P&G Service Fee
   (Preliminaries), "Unverified Estimate" (yellow, single figure, explicit
   N/A-until-verified copy), and "No Pricing Available". cached-scrape
   treated as verified (isLive / not fallback). Batch toast reports
   store-verified vs indicative counts.
5. **Dashboard:** last "coming soon" toast (BoQ tutorial card) removed —
   card now routes to the live Upload BoQ flow in Price Search.
6. Verified absent (nothing to delete): AIConcierge.tsx, WhatsApp share
   buttons, isConciergeOpen flags. Excel 13-column contract + top-of-file
   totals + button copy confirmed intact by tests.

### Validation
- jest: 14 suites / 184 tests passing (knowledge-path regression test
  rewritten to assert the no-fabrication contract).
- tsc --noEmit clean · ESLint 0 errors · next build clean.

### Behavioural note
Until the price pipeline warms price_cache, most lines will show ONE
labelled indicative estimate with N/A store columns instead of a fake
5-store comparison. That is the intended honest state — run the pipeline
(Actions → Price Pipeline) to start filling real store prices.
