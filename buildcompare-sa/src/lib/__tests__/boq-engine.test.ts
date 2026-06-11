/**
 * Regression tests for the BoQ direct-parser column detection.
 *
 * Guards the bug where an "Item No" column was mistaken for the description
 * column, so item-ref numbers (100, 101, …) leaked in as material names and
 * every line collapsed to the "other" category.
 *
 * Also guards the SAPS-BoQ bias bug: structural summary lines and
 * Preliminaries items must NEVER receive fabricated retail price spreads
 * (the "Cashbuild always wins" failure mode) — they carry an all-N/A
 * 5-store matrix instead.
 */
// The batch resolver imports the AI SDKs, which need `fetch` (absent in the
// jsdom test env). Mock both providers — and make any call THROW, which also
// proves intercepted lines never reach an AI estimator.
jest.mock('../groq', () => ({
    isGroqConfigured: false,
    groqClient: {
        chat: { completions: { create: () => { throw new Error('unexpected Groq call in test'); } } },
    },
}));
jest.mock('../deepseek', () => ({
    checkDeepseekConfigured: () => false,
    getDeepseekClient: () => { throw new Error('unexpected DeepSeek call in test'); },
}));
// Warm price_cache returns nothing here, so the resolver exercises the
// knowledge/estimate fallback deterministically (no network in the test env).
jest.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: () => ({ select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) }),
    }),
}));

import * as XLSX from 'xlsx';
import {
    tryDirectBoQParse,
    guessCategory,
    isStructuralSummaryLine,
    shouldBypassRetailPricing,
    materialsFromParsedRows,
} from '../boq-engine';
import { resolveBatchPrices } from '../batch-price-resolver';
import { RETAIL_STORES } from '../retail-matrix';
import type { Material } from '@/types';

/** Build an .xlsx ArrayBuffer from an array-of-arrays. */
function sheetBuffer(rows: (string | number)[][]): ArrayBuffer {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BOQ');
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

describe('tryDirectBoQParse — description column detection', () => {
    it('picks the Description column, not the leading "Item No" ref column', () => {
        const buf = sheetBuffer([
            ['Item No', 'Description', 'Unit', 'Qty'],
            [100, 'Cemcrete Portland Cement 50kg', 'bag', 8],
            [101, '20A single pole circuit breaker', 'No', 5],
            [102, 'Clay face brick NFP', 'each', 1000],
        ]);

        const materials = tryDirectBoQParse(buf);
        expect(materials).not.toBeNull();
        const names = materials!.map((m) => m.name);

        // Names must be the real descriptions, never the ref numbers.
        expect(names).toContain('Cemcrete Portland Cement 50kg');
        expect(names).toContain('20A single pole circuit breaker');
        expect(names.some((n) => /^\d+$/.test(n))).toBe(false);
    });

    it('does not collapse every line into "other" — real descriptions classify', () => {
        const buf = sheetBuffer([
            ['Item No', 'Description', 'Unit', 'Qty'],
            [1, 'AfriSam All Purpose Cement 50kg', 'bag', 20],
            [2, 'Y12 reinforcing steel bar 6m', 'length', 12],
        ]);

        const materials = tryDirectBoQParse(buf)!;
        const categories = materials.map((m) => m.category);
        expect(categories).not.toEqual(['other', 'other']);
        // Cement description classifies as the legacy 'cement' bucket.
        expect(guessCategory('AfriSam All Purpose Cement 50kg')).toBe('cement');
    });

    it('skips rows where a bare item-ref leaks into the description column', () => {
        // A malformed sheet with no usable description header — heuristic may
        // still grab a ref column, but bare-number rows must be dropped.
        const buf = sheetBuffer([
            ['Description', 'Unit', 'Qty'],
            ['100', 'No', 8],
            ['Cemcrete Portland Cement 50kg', 'bag', 5],
        ]);

        const materials = tryDirectBoQParse(buf)!;
        const names = materials.map((m) => m.name);
        expect(names).not.toContain('100');
        expect(names).toContain('Cemcrete Portland Cement 50kg');
    });

    it('drops structural heading/summary rows at parse time', () => {
        const buf = sheetBuffer([
            ['Description', 'Unit', 'Qty'],
            ['SECTION 2', 'sum', 1],
            ['BILL NO. 1', 'sum', 1],
            ['Total carried forward', 'sum', 1],
            ['Cemcrete Portland Cement 50kg', 'bag', 5],
        ]);

        const materials = tryDirectBoQParse(buf)!;
        const names = materials.map((m) => m.name);
        expect(names).toEqual(['Cemcrete Portland Cement 50kg']);
    });
});

describe('isStructuralSummaryLine — SAPS BoQ scaffolding detection', () => {
    it.each([
        'SECTION 2',
        'Section 2: Alterations',
        'BILL NO. 1',
        'SECTION BILL NO.1 CARRIED FORWARD',
        'PRELIMINARIES AND GENERAL',
        'ALTERATIONS',
        'For Preambles refer to "Specifications"',
        'Total carried to summary',
        'Sub-total brought forward',
        'Grand Total',
    ])('flags structural line: %s', (line) => {
        expect(isStructuralSummaryLine(line)).toBe(true);
    });

    it.each([
        'Sectional overhead garage door 2440mm',
        'Bills of quantities binder A4',
        'Totally enclosed motor 3kW',
        '20 A Single pole circuit breaker',
        'Cemcrete Portland Cement 50kg',
        'Allow for site establishment and supervision', // payable P&G item — kept (priced via labour)
    ])('keeps real line item: %s', (line) => {
        expect(isStructuralSummaryLine(line)).toBe(false);
    });
});

describe('shouldBypassRetailPricing — no fabricated spreads for non-retail lines', () => {
    it('bypasses confident Preliminaries / P&G allowance items', () => {
        expect(shouldBypassRetailPricing({ name: 'Allow for site establishment and supervision' })).toBe(true);
        expect(shouldBypassRetailPricing({ name: 'Provisional sum: traffic accommodation' })).toBe(true);
    });

    it('bypasses lines explicitly classified Preliminaries by the pipeline', () => {
        expect(shouldBypassRetailPricing({ name: 'Daily site diary', tenderCategory: 'Preliminaries' })).toBe(true);
    });

    it('bypasses structural scaffolding that slipped past parsing', () => {
        expect(shouldBypassRetailPricing({ name: 'SECTION BILL NO.1 CARRIED FORWARD' })).toBe(true);
    });

    it('never bypasses real materials', () => {
        expect(shouldBypassRetailPricing({ name: 'PPC Surebuild Cement 42.5N 50kg' })).toBe(false);
        expect(shouldBypassRetailPricing({ name: '20 A Single pole circuit breaker' })).toBe(false);
        // A weak P&G keyword ("allow") inside a real product must not bypass.
        expect(shouldBypassRetailPricing({ name: 'Galvanised wall ties (allow 5% waste)' })).toBe(false);
    });
});

describe('materialsFromParsedRows — structural rows are dropped, not priced', () => {
    it('drops heading rows the LLM extracted anyway', () => {
        const { materials, dropped } = materialsFromParsedRows(
            [
                { description: 'Bill No. 1', qty: 1, unit: 'sum' },
                { description: 'PPC Surebuild Cement 42.5N 50kg', qty: 10, unit: 'bags', category: 'Concrete' },
            ],
            { today: new Date('2026-06-11T08:00:00Z') },
        );
        expect(materials).toHaveLength(1);
        expect(materials[0].name).toBe('PPC Surebuild Cement 42.5N 50kg');
        expect(dropped).toHaveLength(1);
        expect(dropped[0].reason).toContain('structural');
    });
});

describe('resolveBatchPrices — Preliminaries rows get a null retail matrix', () => {
    const prelimMaterial: Material = {
        id: 'prelim-1',
        name: 'Allow for site establishment and supervision',
        category: 'hardware',
        quantity: 1,
        unit: 'sum',
    };

    it('intercepts the row: no arbitrary retail values in any of the 5 store columns', async () => {
        const { results, stats } = await resolveBatchPrices([prelimMaterial]);

        expect(results).toHaveLength(1);
        const r = results[0];

        // No fabricated quotes, no fake "best deal", no fake savings.
        expect(r.source).toBe('no-retail-pricing');
        expect(r.quotes).toHaveLength(0);
        expect(r.bestPrice).toBeNull();
        expect(r.potentialSavings).toBe(0);

        // Every one of the 5 canonical store columns is an honest N/A.
        for (const store of RETAIL_STORES) {
            expect(r.matrix[store].priceZar).toBeNull();
            expect(r.matrix[store].status).toBe('N/A');
        }

        // The line still resolves BCCEI labour, so it remains costable.
        expect(r.tenderCategory).toBe('Preliminaries');
        expect(r.bccei.totalZar).toBeGreaterThan(0);
        expect(r.bccei.basis).toContain('BCCEI');

        // Site-services P&G lines are costed via the B2B service-rate book —
        // an explicitly-labelled estimate, never a retail quote.
        expect(r.pgService).toBeTruthy();
        expect(r.pgService!.totalZar).toBeGreaterThan(0);
        expect(r.pgService!.basis).toContain('B2B site-services rate');

        expect(stats.nonRetail).toBe(1);
        expect(stats.aiEstimated).toBe(0);
    });

    it('real material on a cache miss → single indicative estimate, NO fabricated spread', async () => {
        const cement: Material = {
            id: 'mat-1',
            name: 'PPC Surebuild Cement 42.5N 50kg',
            category: 'cement',
            quantity: 10,
            unit: 'bags',
        };
        const { results, stats } = await resolveBatchPrices([cement]);
        const r = results[0];

        expect(stats.nonRetail).toBe(0);
        expect(r.source).toBe('market-knowledge');

        // The market-knowledge fallback must NEVER invent a per-store
        // comparison (the old `pricePosition` curve crowned Cashbuild on
        // every line). One labelled estimate; all 5 columns honest N/A.
        expect(r.quotes).toHaveLength(0);
        expect(r.bestPrice).toBeNull();
        expect(r.indicativeEstimateZar).toBeGreaterThan(0);
        expect(r.estimateBasis).toContain('not store-verified');
        for (const store of RETAIL_STORES) {
            expect(r.matrix[store].priceZar).toBeNull();
            expect(r.matrix[store].status).toBe('N/A');
        }
    });
});
