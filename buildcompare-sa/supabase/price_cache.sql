-- ============================================================
-- price_cache — warm store of real scraped retail prices.
--
-- Populated by the background pipeline (scraper/pipeline.py, run on a
-- GitHub Actions cron). The app reads this table cache-first so user
-- searches return REAL per-store prices instantly, instead of scraping
-- live or falling back to fabricated estimates.
--
-- One row per (store, material_key). The pipeline UPSERTs on that pair so
-- each store/material keeps a single latest price with a scraped_at stamp.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.price_cache (
    id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    -- Canonical store id: builders | cashbuild | leroy_merlin | buco | buildit
    store        TEXT NOT NULL,
    -- Deterministic key: lower(query) with every non-alphanumeric char removed.
    -- MUST match priceCacheKey() in src/lib/price-cache.ts and the worker.
    material_key TEXT NOT NULL,
    -- The human search string that produced this row (for debugging/audit).
    query_text   TEXT NOT NULL,
    -- Matched product name as shown on the retailer site.
    product_name TEXT,
    price        NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    in_stock     BOOLEAN NOT NULL DEFAULT TRUE,
    scraped_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (store, material_key)
);

CREATE INDEX IF NOT EXISTS price_cache_material_key_idx ON public.price_cache (material_key);
CREATE INDEX IF NOT EXISTS price_cache_scraped_at_idx   ON public.price_cache (scraped_at);

-- ── Row Level Security ─────────────────────────────────────────────
-- Prices are PUBLIC reference data (retail shelf prices) — both the anon
-- and authenticated roles may read. The server-side reader uses the anon
-- key with no user session; the original authenticated-only policy made
-- every read return ZERO rows silently, so all store columns were N/A.
-- There is NO write policy, so inserts/updates are only possible with the
-- service-role key (used exclusively by the background pipeline, which
-- bypasses RLS). This keeps the warm cache tamper-proof from the client.
ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read price cache" ON public.price_cache;
DROP POLICY IF EXISTS "Anyone can read price cache" ON public.price_cache;
CREATE POLICY "Anyone can read price cache"
    ON public.price_cache
    FOR SELECT
    TO anon, authenticated
    USING (true);
