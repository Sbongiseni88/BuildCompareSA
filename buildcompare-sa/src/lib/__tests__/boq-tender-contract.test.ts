/**
 * Tender-grade BoQ contract tests (Milestone 3).
 *
 * Locks the integrity rules added in the tender-pivot refactor:
 * - the category "other" can never escape the extraction pipeline;
 * - descriptions that mirror the item reference are rejected;
 * - the AI prompt mandates the 8 BCCEI categories;
 * - labour figures resolve through the BCCEI estimator;
 * - an explicit tenderCategory wins over re-classification.
 */

import * as XLSX from 'xlsx';
import {
    BOQ_EXTRACT_PROMPT,
    guessCategory,
    materialsFromParsedRows,
    tryDirectBoQParse,
} from '../boq-engine';
import { mapTenderToLegacyCategory } from '../tender-categories';
import { BOQ_CATEGORIES } from '../bccei/labour-defaults';
import { estimateLabour } from '../bccei/labour';
import { buildSourcingRows } from '../sourcing-file';
import type { ComparisonResult, Material } from '@/types';

const TODAY = new Date('2026-06-10T08:00:00Z');

describe('BOQ_EXTRACT_PROMPT (DeepSeek contract)', () => {
    it('offers exactly the 8 BCCEI categories', () => {
        for (const cat of BOQ_CATEGORIES) {
            expect(BOQ_EXTRACT_PROMPT).toContain(cat);
        }
    });

    it('explicitly forbids the word "other"', () => {
        expect(BOQ_EXTRACT_PROMPT).toMatch(/"other"\s*\n?\s*is FORBIDDEN/);
        // "other" must never be offered as a selectable category value
        expect(BOQ_EXTRACT_PROMPT).not.toMatch(/category[^.]*:\s*[^.]*\bother\b/i);
    });

    it('demands literal descriptions, never item references', () => {
        expect(BOQ_EXTRACT_PROMPT).toContain('NEVER an item number');
        expect(BOQ_EXTRACT_PROMPT).toContain('item_ref');
    });
});

describe('guessCategory (legacy shim)', () => {
    it('classifies real materials into legacy buckets', () => {
        expect(guessCategory('AfriSam All Purpose Cement 50kg')).toBe('cement');
        expect(guessCategory('20 A Single pole circuit breaker')).toBe('electrical');
        expect(guessCategory('110mm PVC pipe class 34')).toBe('plumbing');
    });

    it('never returns "other", even for unclassifiable junk', () => {
        expect(guessCategory('zzqx unknowable widget')).not.toBe('other');
        expect(guessCategory('')).not.toBe('other');
    });
});

describe('mapTenderToLegacyCategory', () => {
    it('maps every BCCEI category to a non-"other" legacy value', () => {
        for (const cat of BOQ_CATEGORIES) {
            const legacy = mapTenderToLegacyCategory(cat);
            expect(legacy).not.toBe('other');
            expect(legacy.length).toBeGreaterThan(0);
        }
    });

    it('maps the core trades to their retail equivalents', () => {
        expect(mapTenderToLegacyCategory('Concrete')).toBe('cement');
        expect(mapTenderToLegacyCategory('Masonry')).toBe('bricks');
        expect(mapTenderToLegacyCategory('Structural Steel')).toBe('steel');
        expect(mapTenderToLegacyCategory('Electrical')).toBe('electrical');
    });
});

describe('materialsFromParsedRows (integrity filter)', () => {
    it('maps a valid AI row with BCCEI labour and the 8-category taxonomy', () => {
        const { materials, dropped } = materialsFromParsedRows(
            [{ item_ref: '3.2.1', description: '20 A Single pole circuit breaker', qty: 5, unit: 'No', category: 'Electrical' }],
            { today: TODAY },
        );

        expect(dropped).toHaveLength(0);
        expect(materials).toHaveLength(1);
        const m = materials[0];
        expect(m.name).toBe('20 A Single pole circuit breaker');
        expect(m.tenderCategory).toBe('Electrical');
        expect(m.category).toBe('electrical');
        // Labour must equal the BCCEI estimator output — never an LLM guess.
        const expected = estimateLabour({ category: 'Electrical', qty: 5, unit: 'No', today: TODAY });
        expect(m.laborCostEstimate).toBe(expected.totalZar);
    });

    it('drops rows whose description mirrors the item reference', () => {
        const { materials, dropped } = materialsFromParsedRows(
            [{ item_ref: '101', description: '101', qty: 1, unit: 'No' }],
            { today: TODAY },
        );
        expect(materials).toHaveLength(0);
        expect(dropped).toHaveLength(1);
    });

    it('drops bare-number and "item N" placeholder descriptions', () => {
        const { materials, dropped } = materialsFromParsedRows(
            [
                { description: '42', qty: 1, unit: 'No' },
                { description: 'item 7', qty: 1, unit: 'No' },
            ],
            { today: TODAY },
        );
        expect(materials).toHaveLength(0);
        expect(dropped).toHaveLength(2);
    });

    it('reclassifies an AI category of "other" from the description instead of dropping the row', () => {
        const { materials, dropped } = materialsFromParsedRows(
            [{ description: 'PPC Surebuild Cement 42.5N 50kg', qty: 10, unit: 'bags', category: 'other' }],
            { today: TODAY },
        );
        expect(dropped).toHaveLength(0);
        expect(materials[0].tenderCategory).toBe('Concrete');
        expect(materials[0].category).toBe('cement');
    });

    it('accepts legacy {name, quantity} keys from older prompt formats', () => {
        const { materials } = materialsFromParsedRows(
            [{ name: 'Stock bricks NFP', quantity: 1000, unit: 'No' }],
            { today: TODAY },
        );
        expect(materials).toHaveLength(1);
        expect(materials[0].tenderCategory).toBe('Masonry');
    });
});

describe('tryDirectBoQParse (structural parse)', () => {
    function workbookBuffer(rows: (string | number)[][]): ArrayBuffer {
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'BoQ');
        const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        return out as ArrayBuffer;
    }

    it('populates tenderCategory on every parsed row', () => {
        const buffer = workbookBuffer([
            ['Description', 'Qty', 'Unit'],
            ['PPC Cement 50kg', 10, 'bags'],
            ['Y12 rebar 6m lengths', 40, 'lengths'],
        ]);
        const materials = tryDirectBoQParse(buffer);
        expect(materials).not.toBeNull();
        for (const m of materials!) {
            expect(m.tenderCategory).toBeDefined();
            expect(m.category).not.toBe('other');
        }
        expect(materials![0].tenderCategory).toBe('Concrete');
        expect(materials![1].tenderCategory).toBe('Structural Steel');
    });
});

describe('buildSourcingRows (tenderCategory precedence)', () => {
    function resultFor(material: Material): ComparisonResult {
        return {
            material,
            quotes: [],
            bestPrice: null,
            averagePrice: 0,
            potentialSavings: 0,
        };
    }

    it('prefers an explicit pipeline tenderCategory over description re-classification', () => {
        const material: Material = {
            id: 'm1',
            name: 'PPC Cement 50kg', // description says Concrete…
            category: 'cement',
            tenderCategory: 'Electrical', // …but the pipeline says Electrical
            quantity: 2,
            unit: 'bags',
        };
        const rows = buildSourcingRows([resultFor(material)], TODAY);
        expect(rows[0].category).toBe('Electrical');
    });

    it('falls back to description classification when tenderCategory is absent', () => {
        const material: Material = {
            id: 'm2',
            name: 'PPC Cement 50kg',
            category: 'hardware',
            quantity: 2,
            unit: 'bags',
        };
        const rows = buildSourcingRows([resultFor(material)], TODAY);
        expect(rows[0].category).toBe('Concrete');
    });
});
