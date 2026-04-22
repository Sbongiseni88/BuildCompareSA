/**
 * BOQ Processing Engine
 *
 * Handles material normalization, deduplication, price caching,
 * and parallel batch lookups for Bill of Quantities processing.
 */

import * as XLSX from 'xlsx';
import { Material } from '@/types';

// ─── File Type Detection ────────────────────────────────────────────────────

export function isSpreadsheetFile(mimeType: string, fileName: string, buffer?: ArrayBuffer): boolean {
    const name = fileName.toLowerCase();
    if (['.xlsx', '.xls', '.csv'].some(ext => name.endsWith(ext))) return true;
    const mimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/csv',
    ];
    if (mimes.includes(mimeType)) return true;
    if (buffer && buffer.byteLength >= 4) {
        const h = new Uint8Array(buffer.slice(0, 4));
        if (h[0] === 0x50 && h[1] === 0x4B && h[2] === 0x03 && h[3] === 0x04) return true;
    }
    return false;
}

export function isPdfFile(mimeType: string, fileName: string): boolean {
    return mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
}

// ─── Text Extraction ────────────────────────────────────────────────────────

export function extractPdfText(buffer: ArrayBuffer): string {
    const raw = Buffer.from(buffer).toString('binary');
    const texts: string[] = [];

    const tjRe = /\(([^)\\]|\\.)*\)\s*Tj/g;
    let m: RegExpExecArray | null;

    const unescape = (s: string) =>
        s.replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
         .replace(/\\\\/g, '').replace(/\\\(/g, '(').replace(/\\\)/g, ')')
         .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

    while ((m = tjRe.exec(raw)) !== null) {
        const inner = unescape(m[0].replace(/\)\s*Tj$/, '').slice(1));
        if (inner.trim()) texts.push(inner.trim());
    }

    const tjArrRe = /\[([^\]]*)\]\s*TJ/g;
    while ((m = tjArrRe.exec(raw)) !== null) {
        const strs = m[1].match(/\(([^)\\]|\\.)*\)/g);
        if (strs) {
            const combined = strs.map(s => unescape(s.slice(1, -1))).join('');
            if (combined.trim()) texts.push(combined.trim());
        }
    }

    const result = texts.join(' ').replace(/\s+/g, ' ').trim();
    return result.length > 12000 ? result.slice(0, 12000) + ' [...TRUNCATED]' : result;
}

export function extractSpreadsheetText(buffer: ArrayBuffer): string {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const parts: string[] = [];
    for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        if (!sheet) continue;
        parts.push(`--- Sheet: ${name} ---`);
        parts.push(XLSX.utils.sheet_to_csv(sheet, { blankrows: false }));
    }
    const result = parts.join('\n');
    return result.length > 30000 ? result.slice(0, 30000) + '\n\n[...TRUNCATED]' : result;
}

// ─── Category Detection ────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    cement:      ['cement', 'concrete', 'mortar', 'screed', 'plaster'],
    bricks:      ['brick', 'block', 'masonry', 'paver'],
    steel:       ['steel', 'rebar', 'reinforcement', 'iron', 'metal', 'frame'],
    timber:      ['timber', 'wood', 'door', 'window', 'frame', 'sill', 'board', 'plank', 'plywood'],
    roofing:     ['roof', 'tile', 'sheet', 'cladding', 'IBR', 'corrugated'],
    plumbing:    ['pipe', 'plumb', 'tap', 'fitting', 'valve', 'drain', 'sewer', 'water'],
    electrical:  ['electric', 'cable', 'wire', 'conduit', 'switch', 'plug', 'light', 'panel'],
    paint:       ['paint', 'primer', 'sealer', 'coat', 'varnish'],
    hardware:    ['bolt', 'screw', 'nail', 'hinge', 'lock', 'anchor', 'fix'],
};

export function guessCategory(description: string): string {
    const lower = description.toLowerCase();
    for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
        if (kws.some(kw => lower.includes(kw))) return cat;
    }
    return 'other';
}

// ─── Direct BoQ Parse (Excel) ────────────────────────────────────────────────

export function tryDirectBoQParse(buffer: ArrayBuffer): Material[] | null {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const allMaterials: Material[] = [];

    const DESC_ALIASES  = ['description', 'desc', 'item', 'material', 'work item', 'activity', 'trade', 'element', 'section', 'particulars'];
    const QTY_ALIASES   = ['quantity', 'qty', 'amount', 'no', 'number', 'count', 'nos', 'no.', 'qnty'];
    const UNIT_ALIASES  = ['unit', 'uom', 'measure', 'u/m', 'u.o.m'];
    const IGNORE_TERMS  = ['total', 'sub-total', 'subtotal', 'summary', 'allow', 'provisional', 'p.c.', 'pc sum', ''];

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
        if (rows.length < 2) continue;

        let headerRowIdx = -1;
        let descCol = -1, qtyCol = -1, unitCol = -1;

        for (let r = 0; r < Math.min(rows.length, 20); r++) {
            const row = rows[r].map((c: any) => String(c).toLowerCase().trim());
            const di = row.findIndex(c => DESC_ALIASES.some(a => c.includes(a)));
            if (di >= 0) {
                headerRowIdx = r;
                descCol = di;
                qtyCol  = row.findIndex(c => QTY_ALIASES.some(a => c.includes(a)));
                unitCol = row.findIndex(c => UNIT_ALIASES.some(a => c.includes(a)));
                break;
            }
        }

        if (headerRowIdx < 0 || descCol < 0) continue;

        let itemIndex = 0;
        for (let r = headerRowIdx + 1; r < rows.length; r++) {
            const row = rows[r];
            const rawDesc = String(row[descCol] ?? '').trim();
            if (!rawDesc || IGNORE_TERMS.some(t => t && rawDesc.toLowerCase().startsWith(t))) continue;
            if (rawDesc.length < 3) continue;

            const rawQty  = qtyCol  >= 0 ? row[qtyCol]  : null;
            const rawUnit = unitCol >= 0 ? String(row[unitCol] ?? '').trim() : '';
            const qty = parseFloat(String(rawQty ?? '').replace(/[^0-9.]/g, '')) || 1;

            allMaterials.push({
                id: `boq-${sheetName}-${itemIndex++}`,
                name: rawDesc,
                brand: undefined,
                category: guessCategory(rawDesc) as any,
                quantity: qty,
                unit: rawUnit || 'unit',
            });
        }
    }

    return allMaterials.length > 0 ? allMaterials : null;
}

// ─── Material Normalization + Deduplication ────────────────────────────────────

/** Normalize a material name to a canonical form for matching */
export function normalizeMaterialName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[()[\]{}]/g, '')     // Strip brackets
        .replace(/\b(cem\s*ii|cem\s*i)\b/gi, '') // Remove CEM grades from dedup key
        .replace(/\b(bags?|pcs|pieces|ea|each|per|unit)\b/gi, '')
        .replace(/\b(no|nr|nos)\.\b/gi, '')
        .replace(/[^a-z0-9\s]/g, ' ')  // Remove special chars
        .replace(/\s+/g, ' ')          // Collapse whitespace
        .trim();
}

export interface DedupResult {
    /** Unique materials with merged quantities */
    unique: Material[];
    /** Total items before dedup */
    originalCount: number;
    /** Number of duplicates removed */
    duplicatesRemoved: number;
}

export function deduplicateMaterials(materials: Material[]): DedupResult {
    const seen = new Map<string, Material>();

    for (const m of materials) {
        const key = normalizeMaterialName(m.name);
        if (seen.has(key)) {
            const existing = seen.get(key)!;
            existing.quantity += m.quantity;
        } else {
            seen.set(key, { ...m });
        }
    }

    return {
        unique: Array.from(seen.values()),
        originalCount: materials.length,
        duplicatesRemoved: materials.length - seen.size,
    };
}

// ─── Price Cache ────────────────────────────────────────────────────────────────

export interface CachedPrice {
    price: number;
    store: string;
    laborEstimate: number;
    confidence: 'high' | 'medium' | 'low';
    timestamp: number;
}

const PRICE_CACHE = new Map<string, CachedPrice>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function getCachedPrice(materialKey: string): CachedPrice | null {
    const entry = PRICE_CACHE.get(materialKey);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) return entry;
    PRICE_CACHE.delete(materialKey);
    return null;
}

export function setCachedPrice(materialKey: string, data: CachedPrice): void {
    PRICE_CACHE.set(materialKey, data);
}

export function getCacheStats(): { size: number; hitRate: string } {
    return {
        size: PRICE_CACHE.size,
        hitRate: `${PRICE_CACHE.size} items cached`,
    };
}

// ─── Time Estimation ────────────────────────────────────────────────────────────

/** Estimate remaining time based on processing velocity */
export function estimateRemainingTime(
    processedItems: number,
    totalItems: number,
    elapsedMs: number
): number {
    if (processedItems <= 0 || totalItems <= 0) return 0;
    const avgTimePerItem = elapsedMs / processedItems;
    const remaining = totalItems - processedItems;
    return Math.round((remaining * avgTimePerItem) / 1000); // seconds
}

// ─── AI Prompt ────────────────────────────────────────────────────────────────

export const BOQ_EXTRACT_PROMPT = `### ROLE: Chunk-Based BoQ Parser
### CONTEXT: 
You are receiving a segmented portion (a "chunk") of a large South African Construction Bill of Quantities. Your task is to extract material data from THIS CHUNK ONLY.

### INSTRUCTIONS:
1. **Analyze Data**: Scan the provided CSV text for construction materials, quantities, and units.
2. **Handle Incomplete Rows**: If a row is cut off at the start or end of the chunk and lacks a description or quantity, IGNORE it (it will be captured in the next chunk).
3. **Ignore Metadata**: Discard headers, page numbers, and preamble text found within the chunk.
4. **Localization**: Formulate \`search_query\` values optimized for South African retailers (Builders, Cashbuild, Leroy Merlin) based on the user's {{location}}.

### OUTPUT RULES:
- Return a raw JSON array of objects. 
- Do not include any introductory or concluding text.
- If no materials are found in this specific chunk, return an empty array \`[]\`.

### JSON SCHEMA:
[
  {
    "material": "Standardized Name",
    "specs": "Dimensions/Grade",
    "qty": 0,
    "unit": "Unit",
    "search_query": "Optimized Store Query"
  }
]`;

/** Normalise whatever the LLM returned into a plain array. */
export function normaliseParsed(parsed: any): any[] {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
        for (const key of ['materials', 'items', 'results', 'data']) {
            if (Array.isArray(parsed[key])) return parsed[key];
        }
        const values = Object.values(parsed);
        if (values.length > 0 && values.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
            return values as any[];
        }
        return [parsed];
    }
    return [];
}
