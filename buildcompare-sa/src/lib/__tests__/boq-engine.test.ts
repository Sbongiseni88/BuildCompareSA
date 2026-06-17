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
    isNarrativePreambleLine,
    shouldBypassRetailPricing,
    materialsFromParsedRows,
    sanitizeBoqText,
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

describe('tryDirectBoQParse — dynamic section context (2,750-row "all Preliminaries" regression)', () => {
    // A multi-section document: the bug classified EVERY row below
    // "Section No 1: Preliminaries" as Preliminaries → entire sheet N/A.
    const buf = sheetBuffer([
        ['Description', 'Unit', 'Qty'],
        ['SECTION NO 1: PRELIMINARIES', '', ''],
        ['Daily record keeping and site instructions', 'sum', 1],
        ['SECTION NO 2: BUILDERS WORK', '', ''],
        ['Make good existing surfaces where damaged', 'm2', 40],
        ['PPC Surebuild Cement 42.5N 50kg', 'bags', 100],
        ['PLUMBING: DRAINAGE', '', ''],
        ['Excavate trench and backfill for services', 'm', 120],
        ['SECTION NO 4: ELECTRICAL INSTALLATION', '', ''],
        ['Test and commission the installation', 'sum', 1],
        ['20A single pole circuit breaker', 'No', 12],
    ]);
    const materials = tryDirectBoQParse(buf)!;
    const byName = (n: string) => materials.find((m) => m.name === n)!;

    it('section headings are consumed as context, never emitted as materials', () => {
        const names = materials.map((m) => m.name);
        expect(names).not.toContain('SECTION NO 1: PRELIMINARIES');
        expect(names).not.toContain('PLUMBING: DRAINAGE');
        expect(materials).toHaveLength(6);
    });

    it('keyword-less rows inherit the ACTIVE section — not the first one', () => {
        expect(byName('Daily record keeping and site instructions').tenderCategory).toBe('Preliminaries');
        expect(byName('Make good existing surfaces where damaged').tenderCategory).toBe('Masonry');
        expect(byName('Excavate trench and backfill for services').tenderCategory).toBe('Plumbing');
        expect(byName('Test and commission the installation').tenderCategory).toBe('Electrical');
    });

    it('a high-confidence row keyword still beats the section trade', () => {
        // Cement line inside "Builders Work" is Concrete, not Masonry.
        expect(byName('PPC Surebuild Cement 42.5N 50kg').tenderCategory).toBe('Concrete');
        expect(byName('20A single pole circuit breaker').tenderCategory).toBe('Electrical');
    });

    it('ONLY Section-1 rows bypass retail pricing — later sections get priced', () => {
        expect(shouldBypassRetailPricing(byName('Daily record keeping and site instructions'))).toBe(true);
        expect(shouldBypassRetailPricing(byName('Make good existing surfaces where damaged'))).toBe(false);
        expect(shouldBypassRetailPricing(byName('Excavate trench and backfill for services'))).toBe(false);
        expect(shouldBypassRetailPricing(byName('Test and commission the installation'))).toBe(false);
        expect(shouldBypassRetailPricing(byName('20A single pole circuit breaker'))).toBe(false);
    });

    it('resolver integration: Section 1 → N/A allowance, Section 4 → pricing path', async () => {
        const { results, stats } = await resolveBatchPrices([
            byName('Daily record keeping and site instructions'),
            byName('Test and commission the installation'),
            byName('PPC Surebuild Cement 42.5N 50kg'),
        ]);

        // Exactly the Section-1 row is non-retail; nothing else is bypassed.
        expect(stats.nonRetail).toBe(1);
        expect(results[0].source).toBe('no-retail-pricing');
        expect(results[0].matrix.cashbuild.status).toBe('N/A');

        // The Section-4 row reaches the pricing path (NOT the N/A bypass).
        expect(results[1].source).not.toBe('no-retail-pricing');

        // A knowledge-matched material pulls a valid indicative number.
        expect(results[2].source).toBe('market-knowledge');
        expect(results[2].indicativeEstimateZar).toBeGreaterThan(0);
    });
});

describe('narrative preamble rows — Preliminaries, never AI-priced (2,630-row MASONRY regression)', () => {
    it.each([
        'Before submitting his tender the contractor shall visit the site',
        'The contractor shall carry out the works in accordance with the specification',
        'View site',
        'SUPPLEMENTARY PREAMBLES',
        'No explosives whatsoever may be used on the site',
        'Explosives',
        'Quantities shall be deemed to include all waste',
    ])('flags narrative: %s', (line) => {
        expect(isNarrativePreambleLine(line)).toBe(true);
        // Regardless of parser path or category tag, narrative never prices.
        expect(shouldBypassRetailPricing({ name: line })).toBe(true);
    });

    it.each([
        'PPC Surebuild Cement 42.5N 50kg',
        'Water supply pipes and fittings 22mm',
        '20 A Single pole circuit breaker',
    ])('keeps real material: %s', (line) => {
        expect(isNarrativePreambleLine(line)).toBe(false);
        expect(shouldBypassRetailPricing({ name: line })).toBe(false);
    });

    it('a row with neither qty nor unit in the sheet is prose, not a line item', () => {
        expect(isNarrativePreambleLine('General', { hasQty: false, hasUnit: false })).toBe(true);
        expect(isNarrativePreambleLine('General purpose mortar 25kg', { hasQty: true, hasUnit: true })).toBe(false);
    });

    it('direct parse: narrative rows under a trade section classify Preliminaries, NOT the trade', () => {
        const buf = sheetBuffer([
            ['Description', 'Unit', 'Qty'],
            ['SECTION NO 2: BUILDERS WORK', '', ''],
            ['View site', '', ''],
            ['The contractor shall allow for all necessary plant', '', ''],
            ['Half brick wall in stretcher bond', 'm2', 200],
        ]);
        const materials = tryDirectBoQParse(buf)!;
        const byName = (n: string) => materials.find((m) => m.name === n)!;

        expect(byName('View site').tenderCategory).toBe('Preliminaries');
        expect(byName('The contractor shall allow for all necessary plant').tenderCategory).toBe('Preliminaries');
        expect(shouldBypassRetailPricing(byName('View site'))).toBe(true);
        // The real material row still classifies into the trade and prices.
        expect(byName('Half brick wall in stretcher bond').tenderCategory).toBe('Masonry');
        expect(shouldBypassRetailPricing(byName('Half brick wall in stretcher bond'))).toBe(false);
    });

    it('a PREAMBLES caption inside a trade bill does NOT hijack the section (SAPS 908-row Preliminaries regression)', () => {
        // Every SAPS trade bill opens "MASONRY" → "PREAMBLES" → items. The
        // old behavior treated PREAMBLES as a switch to Preliminaries and
        // handed the entire bill to the N/A bypass.
        const buf = sheetBuffer([
            ['Description', 'Unit', 'Qty'],
            ['MASONRY', '', ''],
            ['PREAMBLES', '', ''],
            ['SUPPLEMENTARY PREAMBLES', '', ''],
            ['For preambles refer to "Specification PW 371"', '', ''],
            ['Half brick wall in stretcher bond', 'm2', 200],
        ]);
        const materials = tryDirectBoQParse(buf)!;
        // Marker/reference rows are scaffolding — never emitted as materials.
        expect(materials.find((m) => /preambles/i.test(m.name))).toBeUndefined();
        // The trade context survives the preamble markers.
        const wall = materials.find((m) => m.name === 'Half brick wall in stretcher bond')!;
        expect(wall.tenderCategory).toBe('Masonry');
        expect(shouldBypassRetailPricing(wall)).toBe(false);
    });

    it('narrative rows after a PREAMBLES marker still classify Preliminaries via narrative detection', () => {
        const buf = sheetBuffer([
            ['Description', 'Unit', 'Qty'],
            ['MASONRY', '', ''],
            ['PREAMBLES', '', ''],
            ['The contractor shall allow for samples of all face bricks', '', ''],
        ]);
        const materials = tryDirectBoQParse(buf)!;
        const prose = materials.find((m) => /samples of all face bricks/.test(m.name))!;
        expect(prose.tenderCategory).toBe('Preliminaries');
        expect(shouldBypassRetailPricing(prose)).toBe(true);
    });

    it('a medium row keyword beats a stale section trade (pipes inside Masonry)', () => {
        const buf = sheetBuffer([
            ['Description', 'Unit', 'Qty'],
            ['SECTION NO 2: BUILDERS WORK', '', ''],
            ['Water supply pipes and fittings 22mm', 'm', 60],
        ]);
        const materials = tryDirectBoQParse(buf)!;
        expect(materials[0].tenderCategory).toBe('Plumbing');
        expect(shouldBypassRetailPricing(materials[0])).toBe(false);
    });

    it('an "Alterations" bill heading no longer locks the document to Masonry', () => {
        const buf = sheetBuffer([
            ['Description', 'Unit', 'Qty'],
            ['BILL NO 1 - ALTERATIONS AND ADDITIONS', '', ''],
            ['Take down existing ceiling and cart away', 'm2', 80],
        ]);
        const materials = tryDirectBoQParse(buf)!;
        // Unknown-trade bill → context reset; 'ceiling' keyword classifies the row.
        expect(materials[0].tenderCategory).not.toBe('Masonry');
    });
});

describe('mixed-case trade captions & dimension strings (live 2,630-row stuck-on-Preliminaries defect)', () => {
    // Real SAPS docs use Mixed-Case section captions; the all-caps-only rule
    // never switched context, so one early "PRELIMINARIES" owned the sheet.
    const buf = sheetBuffer([
        ['Description', 'Unit', 'Qty'],
        ['PRELIMINARIES', '', ''],
        ['Allow for water and electricity for the works', 'sum', 1],
        ['Concrete, Formwork and Reinforcement', '', ''],
        ['Cast in situ surface beds poured underfloor', 'm3', 18],
        ['Masonry', '', ''],
        ['Half brick wall in stretcher bond', 'm2', 200],
        ['Joinery and Ironmongery', '', ''],
        ['44mm Semi-solid hardwood door 813 x 2032mm', 'No', 4],
        ['Door frame 813\\times2032mm pressed steel', 'No', 4],
    ]);
    const materials = tryDirectBoQParse(buf)!;
    const byName = (n: string) => materials.find((m) => m.name === n)!;

    it('mixed-case trade captions switch the section context', () => {
        expect(byName('Cast in situ surface beds poured underfloor').tenderCategory).toBe('Concrete');
        expect(byName('Half brick wall in stretcher bond').tenderCategory).toBe('Masonry');
        expect(byName('44mm Semi-solid hardwood door 813 x 2032mm').tenderCategory).toBe('Openings');
    });

    it('captions are consumed as context, never emitted as items', () => {
        const names = materials.map((m) => m.name);
        expect(names).not.toContain('Concrete, Formwork and Reinforcement');
        expect(names).not.toContain('Masonry');
        expect(names).not.toContain('Joinery and Ironmongery');
    });

    it('dimension/operator strings ("813 x 2032mm", "813\\times2032mm") never break parsing or pricing', () => {
        // The entry-point sanitizer rewrites the LaTeX code, so the emitted
        // material carries the SCRUBBED name — searchable and store-ready.
        const dims = byName('Door frame 813 x 2032mm pressed steel');
        expect(dims).toBeDefined();
        expect(dims.tenderCategory).toBe('Openings');
        expect(shouldBypassRetailPricing(dims)).toBe(false);
        expect(materials.some((m) => m.name.includes('\\times'))).toBe(false);
        expect(shouldBypassRetailPricing(byName('44mm Semi-solid hardwood door 813 x 2032mm'))).toBe(false);
    });

    it('the Preliminaries section still owns its own allowance rows', () => {
        const allow = byName('Allow for water and electricity for the works');
        expect(allow.tenderCategory).toBe('Preliminaries');
        expect(shouldBypassRetailPricing(allow)).toBe(true);
    });

    it('escape hatch: a real material escapes a missed boundary after Preliminaries', () => {
        const escBuf = sheetBuffer([
            ['Description', 'Unit', 'Qty'],
            ['PRELIMINARIES', '', ''],
            ['Allow for site establishment and supervision', 'sum', 1],
            // A missed trade heading would historically trap this in Section 1:
            ['PPC Surebuild Cement 42.5N 50kg', 'bags', 50],
        ]);
        const mats = tryDirectBoQParse(escBuf)!;
        const cement = mats.find((m) => m.name.includes('Cement'))!;
        expect(cement.tenderCategory).toBe('Concrete');
        expect(shouldBypassRetailPricing(cement)).toBe(false);
        const allow = mats.find((m) => m.name.startsWith('Allow'))!;
        expect(allow.tenderCategory).toBe('Preliminaries');
        expect(shouldBypassRetailPricing(allow)).toBe(true);
    });

    it('a mixed-case line WITHOUT a trade match is ordinary text, not a context reset', () => {
        const noResetBuf = sheetBuffer([
            ['Description', 'Unit', 'Qty'],
            ['Concrete, Formwork and Reinforcement', '', ''],
            ['General arrangement as described', '', ''],   // no trade words, no qty/unit
            ['Cast in situ strip footings', 'm3', 12],
        ]);
        const mats = tryDirectBoQParse(noResetBuf)!;
        const footings = mats.find((m) => m.name.includes('footing'))!;
        expect(footings.tenderCategory).toBe('Concrete');
    });
});

describe('materialsFromParsedRows — dynamic section context for LLM rows', () => {
    const today = new Date('2026-06-11T08:00:00Z');

    it('switches trade context at LLM-emitted section headings', () => {
        const { materials } = materialsFromParsedRows(
            [
                { description: 'Section No 4: Electrical Installation', qty: 1, unit: 'sum' },
                { description: 'Test and commission the installation', qty: 1, unit: 'sum' },
            ],
            { today },
        );
        expect(materials).toHaveLength(1);
        expect(materials[0].tenderCategory).toBe('Electrical');
        expect(shouldBypassRetailPricing(materials[0])).toBe(false);
    });

    it('does NOT trust the LLM "Preliminaries" default outside a P&G section', () => {
        const { materials } = materialsFromParsedRows(
            [
                { description: 'Section No 4: Electrical Installation', qty: 1, unit: 'sum' },
                { description: 'Surface mounted galvanised wireway 75mm', qty: 10, unit: 'm', category: 'Preliminaries' },
            ],
            { today },
        );
        expect(materials[0].tenderCategory).toBe('Electrical');
        expect(shouldBypassRetailPricing(materials[0])).toBe(false);
    });

    it('still trusts "Preliminaries" inside a Preliminaries section', () => {
        const { materials } = materialsFromParsedRows(
            [
                { description: 'Section No 1: Preliminaries', qty: 1, unit: 'sum' },
                { description: 'Daily record keeping and site instructions', qty: 1, unit: 'sum', category: 'Preliminaries' },
            ],
            { today },
        );
        expect(materials[0].tenderCategory).toBe('Preliminaries');
        expect(shouldBypassRetailPricing(materials[0])).toBe(true);
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

// ── sanitizeBoqText — entry-point scrub before any matcher runs ──────────────

describe('sanitizeBoqText', () => {
    it('normalises LaTeX math codes and unicode multipliers', () => {
        expect(sanitizeBoqText('813\\times2032mm door frame')).toBe('813 x 2032mm door frame');
        expect(sanitizeBoqText('Aluminium window 1200×600')).toBe('Aluminium window 1200 x 600');
    });

    it('collapses multi-space blocks, NBSP and control characters', () => {
        expect(sanitizeBoqText('GLAZING TO  STEEL\twith   PUTTY')).toBe('GLAZING TO STEEL with PUTTY');
    });

    it('normalises en/em dashes so heading separators detect', () => {
        expect(sanitizeBoqText('BILL NO 4 – ELECTRICAL')).toBe('BILL NO 4 - ELECTRICAL');
    });

    it('a heading blinded by math characters still switches the section after the scrub', () => {
        const buf = sheetBuffer([
            ['Description', 'Unit', 'Qty'],
            ['Section No 2:  Builders Work', '', ''],
            ['Half brick wall in stretcher bond', 'm2', 200],
        ]);
        const materials = tryDirectBoQParse(buf)!;
        const wall = materials.find((m) => m.name === 'Half brick wall in stretcher bond')!;
        expect(wall.tenderCategory).toBe('Masonry');
    });

    it('HAYLETT formula audit notes are scaffolding, never materials', () => {
        const buf = sheetBuffer([
            ['Description', 'Unit', 'Qty'],
            ['MASONRY', '', ''],
            ['(HAYLETT FORMULA WORK GROUP NO. 118)', '', ''],
            ['Half brick wall in stretcher bond', 'm2', 200],
        ]);
        const materials = tryDirectBoQParse(buf)!;
        expect(materials.find((m) => /haylett/i.test(m.name))).toBeUndefined();
        expect(materials.find((m) => m.name === 'Half brick wall in stretcher bond')!.tenderCategory).toBe('Masonry');
    });
});
