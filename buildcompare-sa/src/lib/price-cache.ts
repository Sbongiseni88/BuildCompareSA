/**
 * price_cache reader.
 *
 * The background pipeline (scraper/pipeline.py) writes real scraped prices into
 * the Supabase `price_cache` table. This module reads them cache-first so user
 * searches return genuine per-store prices instantly — no live scrape, no
 * fabricated estimate — when a fresh row exists.
 *
 * Read-only and stateless: uses the anon key (RLS allows authenticated reads),
 * never the service-role key. Degrades gracefully to an empty result when the
 * table/env is absent, so the caller falls back to its normal path.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
    RETAIL_STORES,
    RETAIL_STORE_LABELS,
    blankMatrix,
    type RetailMatrix,
    type RetailStore,
} from '@/lib/retail-matrix';

/** Rows older than this are treated as stale and ignored (pipeline runs daily). */
export const PRICE_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Deterministic cache key for a search string.
 * MUST stay identical to material_key() in scraper/scrape_core.py.
 * Rule: lower-case, then remove every non-alphanumeric character.
 */
export function priceCacheKey(query: string): string {
    return (query || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

interface PriceCacheRow {
    store: string;
    material_key: string;
    price: number;
    in_stock: boolean;
    scraped_at: string;
}

let _client: SupabaseClient | null = null;
function getReadClient(): SupabaseClient | null {
    if (_client) return _client;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    _client = createClient(url, key, { auth: { persistSession: false } });
    return _client;
}

export interface CachedMatrix {
    matrix: RetailMatrix;
    /** Number of stores that returned a fresh real price (>=1 means usable). */
    hitCount: number;
    /** Oldest contributing row, for surfacing freshness in the UI. */
    oldestScrapedAt: Date | null;
}

/**
 * Look up fresh cached prices for many material keys at once.
 * Returns a map keyed by material_key. Keys with no fresh rows are absent —
 * the caller falls back to live scrape / estimate for those.
 */
export async function readCachedMatrices(
    keys: string[],
    now: number = Date.now(),
): Promise<Map<string, CachedMatrix>> {
    const out = new Map<string, CachedMatrix>();
    const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
    if (uniqueKeys.length === 0) return out;

    const client = getReadClient();
    if (!client) return out;

    let rows: PriceCacheRow[] = [];
    try {
        const { data, error } = await client
            .from('price_cache')
            .select('store, material_key, price, in_stock, scraped_at')
            .in('material_key', uniqueKeys);
        if (error) {
            console.warn('price_cache read failed (falling back):', error.message);
            return out;
        }
        rows = (data ?? []) as PriceCacheRow[];
    } catch (err) {
        console.warn('price_cache read threw (falling back):', err);
        return out;
    }

    // Group fresh rows by material key.
    const byKey = new Map<string, PriceCacheRow[]>();
    for (const row of rows) {
        if (now - new Date(row.scraped_at).getTime() > PRICE_CACHE_TTL_MS) continue;
        if (!RETAIL_STORES.includes(row.store as RetailStore)) continue;
        const list = byKey.get(row.material_key) ?? [];
        list.push(row);
        byKey.set(row.material_key, list);
    }

    for (const [key, freshRows] of byKey) {
        const matrix = blankMatrix('not_found');
        let hitCount = 0;
        let oldest: number | null = null;

        for (const row of freshRows) {
            const store = row.store as RetailStore;
            if (typeof row.price !== 'number' || row.price <= 0) continue;
            matrix[store] = {
                store,
                storeName: RETAIL_STORE_LABELS[store],
                priceZar: row.price,
                status: 'ok',
                source: 'live-scrape', // real scraped data — independent per store
            };
            hitCount++;
            const ts = new Date(row.scraped_at).getTime();
            oldest = oldest == null ? ts : Math.min(oldest, ts);
        }

        if (hitCount > 0) {
            out.set(key, { matrix, hitCount, oldestScrapedAt: oldest != null ? new Date(oldest) : null });
        }
    }

    return out;
}
