/**
 * Tests for the warm price_cache reader.
 *
 * Covers the deterministic key rule (which MUST match material_key() in
 * scraper/scrape_core.py), the catalogue's integrity, and the fresh/stale/
 * partial-coverage grouping logic in readCachedMatrices().
 */

import fs from 'fs';
import path from 'path';

// Mock the Supabase SDK before importing the module under test. The query
// chain client.from(...).select(...).in(...) resolves to mockResponse.
let mockResponse: { data: unknown; error: unknown } = { data: [], error: null };
const inMock = jest.fn(() => Promise.resolve(mockResponse));
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: () => ({ select: () => ({ in: inMock }) }),
    })),
}));

// Env must exist at import time so the reader builds a client.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

import { priceCacheKey, readCachedMatrices, PRICE_CACHE_TTL_MS } from '../price-cache';
import { RETAIL_STORES } from '../retail-matrix';

const NOW = new Date('2026-06-11T12:00:00Z').getTime();
const fresh = new Date(NOW - 60 * 60 * 1000).toISOString();          // 1h old
const stale = new Date(NOW - PRICE_CACHE_TTL_MS - 1000).toISOString(); // just over TTL

beforeEach(() => {
    mockResponse = { data: [], error: null };
    inMock.mockClear();
});

describe('priceCacheKey — must match scraper/scrape_core.py material_key()', () => {
    it('lower-cases and strips every non-alphanumeric character', () => {
        expect(priceCacheKey('20A Single Pole Circuit Breaker')).toBe('20asinglepolecircuitbreaker');
        expect(priceCacheKey('PPC Surebuild Cement 42.5N 50kg')).toBe('ppcsurebuildcement425n50kg');
        expect(priceCacheKey('110mm PVC Sewer Pipe (6m)')).toBe('110mmpvcsewerpipe6m');
    });

    it('is stable regardless of surrounding punctuation/spacing', () => {
        expect(priceCacheKey('  Y12  Rebar! ')).toBe('y12rebar');
        expect(priceCacheKey('')).toBe('');
    });
});

describe('material catalogue integrity', () => {
    const catalogue = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../../../scraper/catalogue.json'), 'utf8'),
    );
    const CATEGORIES = new Set([
        'Preliminaries', 'Concrete', 'Masonry', 'Structural Steel',
        'Openings', 'Electrical', 'Plumbing', 'Finishes',
    ]);

    it('every entry has a query and a valid BCCEI category', () => {
        for (const m of catalogue.materials) {
            expect(typeof m.query).toBe('string');
            expect(m.query.length).toBeGreaterThan(2);
            expect(CATEGORIES.has(m.category)).toBe(true);
        }
    });

    it('derives unique, non-empty cache keys (no silent collisions)', () => {
        const keys = catalogue.materials.map((m: { query: string }) => priceCacheKey(m.query));
        expect(keys.every((k: string) => k.length > 0)).toBe(true);
        expect(new Set(keys).size).toBe(keys.length);
    });
});

describe('readCachedMatrices', () => {
    it('returns nothing for an empty key list (and makes no DB call)', async () => {
        const out = await readCachedMatrices([], NOW);
        expect(out.size).toBe(0);
        expect(inMock).not.toHaveBeenCalled();
    });

    it('builds a real matrix from fresh rows, marking only returned stores ok', async () => {
        mockResponse = {
            data: [
                { store: 'builders', material_key: 'cement50kg', price: 105.0, in_stock: true, scraped_at: fresh },
                { store: 'cashbuild', material_key: 'cement50kg', price: 99.5, in_stock: true, scraped_at: fresh },
            ],
            error: null,
        };
        const out = await readCachedMatrices(['cement50kg'], NOW);
        const hit = out.get('cement50kg');
        expect(hit).toBeDefined();
        expect(hit!.hitCount).toBe(2);
        expect(hit!.matrix.builders.priceZar).toBe(105.0);
        expect(hit!.matrix.cashbuild.priceZar).toBe(99.5);
        // Stores the pipeline didn't return stay honest N/A — never mirrored.
        expect(hit!.matrix.leroy_merlin.status).toBe('N/A');
        expect(hit!.matrix.buco.priceZar).toBeNull();
        // Every column is still present (symmetric matrix).
        for (const store of RETAIL_STORES) expect(hit!.matrix[store]).toBeDefined();
    });

    it('ignores rows older than the TTL', async () => {
        mockResponse = {
            data: [{ store: 'builders', material_key: 'olditem', price: 50, in_stock: true, scraped_at: stale }],
            error: null,
        };
        const out = await readCachedMatrices(['olditem'], NOW);
        expect(out.has('olditem')).toBe(false);
    });

    it('drops non-positive prices but keeps valid sibling rows', async () => {
        mockResponse = {
            data: [
                { store: 'builders', material_key: 'k', price: 0, in_stock: false, scraped_at: fresh },
                { store: 'cashbuild', material_key: 'k', price: 42, in_stock: true, scraped_at: fresh },
            ],
            error: null,
        };
        const out = await readCachedMatrices(['k'], NOW);
        expect(out.get('k')!.hitCount).toBe(1);
        expect(out.get('k')!.matrix.builders.status).toBe('N/A');
        expect(out.get('k')!.matrix.cashbuild.priceZar).toBe(42);
    });

    it('falls back to empty (never throws) when the query errors', async () => {
        mockResponse = { data: null, error: { message: 'relation "price_cache" does not exist' } };
        const out = await readCachedMatrices(['anything'], NOW);
        expect(out.size).toBe(0);
    });
});
