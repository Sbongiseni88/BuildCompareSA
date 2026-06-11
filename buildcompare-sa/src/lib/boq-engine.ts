/**
 * BOQ Processing Engine
 *
 * Handles material normalization, deduplication, price caching,
 * and parallel batch lookups for Bill of Quantities processing.
 */

import * as XLSX from 'xlsx';
import { Material } from '@/types';
import {
    guessTenderCategory,
    mapTenderToLegacyCategory,
    lineItemViolation,
    detectSectionContext,
} from './tender-categories';
import { isBoqCategory, type BoqCategory } from './bccei/labour-defaults';
import { estimateLabour } from './bccei/labour';

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

/**
 * Legacy-shaped category guess, now backed by the 8-category tender
 * classifier in `tender-categories.ts`. Returns the closest legacy retail
 * value and NEVER "other" — unclassifiable descriptions resolve through
 * Preliminaries → 'hardware'.
 */
export function guessCategory(description: string): string {
    return mapTenderToLegacyCategory(guessTenderCategory(description).category);
}

// ─── Structural-Line Detection ──────────────────────────────────────────────

/**
 * BoQ rows that are document STRUCTURE, not purchasable materials:
 * section/bill headings, carried/brought-forward sums, totals, summaries,
 * preamble references. Per `.agent/skills/boq_regex_structural_parser` these
 * must be omitted at parse time ("If a row is a heading or sub-total, omit
 * it") — and they must never reach the retail pricing matrix.
 *
 * Word-boundary anchored so real products survive: "Sectional garage door"
 * and "Bills of quantities binder" do NOT match.
 */
const STRUCTURAL_SUMMARY_RE = new RegExp(
    [
        // "Bill No. 1", "SECTION BILL NO.1 …" — a bill reference with a number.
        /^(?:section\s+)?bill\s*(?:no\.?)?\s*\d+\b/.source,
        // "Section 2", "Section 2: Alterations" — a numbered section heading.
        // (NOT "Section steel angle 40mm" — a number must follow directly.)
        /^section\s*(?:no\.?)?\s*\d+\s*(?:[:\-–—].*)?$/.source,
        /\b(carried|brought)\s+(forward|to\s+(summary|collection))\b/.source,
        /^(sub-?total|total|summary|collection|grand\s+total)\b/.source,
        /^preliminaries(\s+and\s+general(\s+items)?)?\s*$/.source,        // bare P&G heading (payable P&G items keep their text)
        /^preambles?\b/.source,
        /\bfor\s+preambles?\s+refer\b/.source,
        /^alterations?\s*$/.source,                                       // bare section heading only
    ].join('|'),
    'i',
);

export function isStructuralSummaryLine(description: string): boolean {
    const desc = (description ?? '').trim();
    if (!desc) return true;
    return STRUCTURAL_SUMMARY_RE.test(desc);
}

// ─── Narrative-Preamble Detection ───────────────────────────────────────────

/**
 * Tender-condition NARRATIVE rows — site briefs, contractor obligations,
 * measurement notes ("The contractor shall…", "Before submitting his
 * tender…", "View site", "Explosives"). These are operational preamble, not
 * purchasable materials: they classify as Preliminaries (honest N/A matrix,
 * costed via P&G/labour) and must NEVER receive an AI price estimate —
 * a R500 "indicative estimate" against the word "Explosives" is fabricated
 * data wearing a price tag.
 */
const NARRATIVE_PREAMBLE_RE = new RegExp(
    [
        /\b(?:the\s+)?(?:contractor|tenderer|employer|subcontractor)s?\s+(?:shall|must|is\s+to|will|may)\b/.source,
        /\bbefore\s+submitting\b/.source,
        /\bview\s+(?:the\s+)?site\b/.source,
        /\bsupplementary\s+preambles?\b/.source,
        /\bmethod\s+of\s+measurement\b/.source,
        /\bexplosives?\s+whatsoever\b/.source,
        /^explosives?\s*$/.source,
        /\brefer\s+to\s+the\s+(?:special|general|standard)\s+conditions\b/.source,
        /\bshall\s+be\s+deemed\b/.source,
    ].join('|'),
    'i',
);

/**
 * True when a row reads as tender-condition narrative rather than a
 * material. `hasQty`/`hasUnit` reflect the row's OWN cells in the source
 * sheet: a row with neither a quantity nor a unit is prose, not a line item.
 */
export function isNarrativePreambleLine(
    description: string,
    opts: { hasQty?: boolean; hasUnit?: boolean } = {},
): boolean {
    const desc = (description ?? '').trim();
    if (!desc) return false;
    if (NARRATIVE_PREAMBLE_RE.test(desc)) return true;
    return opts.hasQty === false && opts.hasUnit === false;
}

/**
 * True when a line must NOT receive retail hardware prices:
 * - structural summaries/headings that slipped past parsing, and
 * - Preliminaries lines (P&G allowances, site establishment, supervision…)
 *   — payable via BCCEI labour/allowances, but no hardware store sells them.
 *
 * Per `.agent/skills/retail_matrix_normalization`, these lines carry an
 * all-N/A 5-store matrix. Fabricating a price spread for them is the
 * "Cashbuild always wins" bias this guard exists to prevent.
 */
export function shouldBypassRetailPricing(material: Pick<Material, 'name' | 'tenderCategory'>): boolean {
    if (isStructuralSummaryLine(material.name)) return true;
    // Tender-condition narrative ("the contractor shall…", "View site",
    // "Explosives") is never a purchasable material — no matter which
    // parser produced it or what category it carries.
    if (isNarrativePreambleLine(material.name)) return true;
    // Explicit pipeline classification is trusted as-is.
    if (material.tenderCategory === 'Preliminaries') return true;
    // Description-derived classification only counts when it matched a real
    // P&G keyword with high confidence — never the low-confidence default.
    const guess = guessTenderCategory(material.name || '');
    return guess.category === 'Preliminaries' && guess.confidence === 'high';
}

// ─── Direct BoQ Parse (Excel) ────────────────────────────────────────────────

export function tryDirectBoQParse(buffer: ArrayBuffer): Material[] | null {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const allMaterials: Material[] = [];

    // NOTE: 'item'/'items' are deliberately excluded. SA BoQs almost always have
    // an "Item No" / "Item Ref" column holding bare reference numbers (100, 101…).
    // Treating "item" as a description alias made the parser grab that column and
    // emit the ref numbers as descriptions (→ everything classified "other").
    const DESC_ALIASES  = [
        'description', 'desc', 'material', 'work item', 'activity', 'trade', 'element', 'section', 'particulars',
        'detail', 'details', 'name', 'product', 'products', 'specification', 'specifications', 'scope', 'work'
    ];
    const QTY_ALIASES   = [
        'quantity', 'qty', 'amount', 'no', 'number', 'count', 'nos', 'no.', 'qnty', 'vol', 'volume', 'qty.', 'qnty.'
    ];
    const UNIT_ALIASES  = [
        'unit', 'uom', 'measure', 'u/m', 'u.o.m', 'units', 'u.m', 'u.m.'
    ];
    // NOTE: 'allow' / 'provisional' / 'p.c.' rows are deliberately KEPT —
    // they are payable P&G lines, costed via the B2B services module and
    // BCCEI labour (never retail-priced). Only summary scaffolding is skipped.
    const IGNORE_TERMS  = ['total', 'sub-total', 'subtotal', 'summary', ''];

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
        if (rows.length < 2) continue;

        let headerRowIdx = -1;
        let descCol = -1, qtyCol = -1, unitCol = -1;

        // Scan up to 50 rows for header aliases
        for (let r = 0; r < Math.min(rows.length, 50); r++) {
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

        // If we didn't find headers via alias matching, try heuristic matching based on content characteristics
        if (headerRowIdx < 0 || descCol < 0) {
            const numCols = Math.max(...rows.map(r => r.length));
            if (numCols > 0) {
                let bestDescCol = -1;
                let bestDescScore = 0;
                
                // 1. Guess description column: column with the longest average non-numeric string length
                for (let c = 0; c < numCols; c++) {
                    let totalLen = 0;
                    let strCount = 0;
                    let totalRows = 0;
                    
                    for (let r = 0; r < Math.min(rows.length, 50); r++) {
                        const val = String(rows[r][c] ?? '').trim();
                        if (!val) continue;
                        totalRows++;
                        const isNum = !isNaN(Number(val.replace(/[^0-9.-]/g, ''))) && val.replace(/[^0-9.-]/g, '') !== '';
                        if (!isNum) {
                            totalLen += val.length;
                            strCount++;
                        }
                    }
                    
                    if (strCount > 0) {
                        const avgLen = totalLen / strCount;
                        const density = totalRows / Math.min(rows.length, 50);
                        const score = avgLen * density;
                        if (avgLen > 10 && score > bestDescScore) {
                            bestDescScore = score;
                            bestDescCol = c;
                        }
                    }
                }
                
                if (bestDescCol >= 0) {
                    descCol = bestDescCol;
                    headerRowIdx = 0; // Scan all rows if heuristic
                    
                    // 2. Guess quantity column: column with the highest density of numbers (that is not description)
                    let bestQtyCol = -1;
                    let bestQtyCount = 0;
                    for (let c = 0; c < numCols; c++) {
                        if (c === descCol) continue;
                        let qtyCount = 0;
                        for (let r = 0; r < Math.min(rows.length, 50); r++) {
                            const val = String(rows[r][c] ?? '').trim();
                            if (!val) continue;
                            const isNum = !isNaN(Number(val.replace(/[^0-9.-]/g, ''))) && val.replace(/[^0-9.-]/g, '') !== '';
                            if (isNum) qtyCount++;
                        }
                        if (qtyCount > bestQtyCount) {
                            bestQtyCount = qtyCount;
                            bestQtyCol = c;
                        }
                    }
                    qtyCol = bestQtyCol;
                    
                    // 3. Guess unit column: column containing common unit terms
                    let bestUnitCol = -1;
                    let bestUnitCount = 0;
                    const COMMON_UNITS = ['m', 'm2', 'm3', 'kg', 'bag', 'bags', 'ea', 'each', 'no', 'nos', 'l', 'litre', 'litres', 'ton', 'tons', 'length', 'lengths', 'sheet', 'sheets', 'roll', 'rolls', 'lot', 'u', 'unit', 'units'];
                    for (let c = 0; c < numCols; c++) {
                        if (c === descCol || c === qtyCol) continue;
                        let unitCount = 0;
                        for (let r = 0; r < Math.min(rows.length, 50); r++) {
                            const val = String(rows[r][c] ?? '').toLowerCase().trim();
                            if (COMMON_UNITS.includes(val)) {
                                unitCount++;
                            }
                        }
                        if (unitCount > bestUnitCount) {
                            bestUnitCount = unitCount;
                            bestUnitCol = c;
                        }
                    }
                    unitCol = bestUnitCol;
                }
            }
        }

        if (headerRowIdx < 0 || descCol < 0) continue;

        // Dynamic section context — "Section No 2: Builders Work" switches
        // the active trade for every FOLLOWING row until the next heading.
        // Without this, keyword-less rows across a 2,750-row document all
        // collapsed into the Preliminaries default and priced as N/A.
        let activeSection: BoqCategory | null = null;

        let itemIndex = 0;
        for (let r = headerRowIdx + 1; r < rows.length; r++) {
            const row = rows[r];
            const rawDesc = String(row[descCol] ?? '').trim();
            if (!rawDesc || IGNORE_TERMS.some(t => t && rawDesc.toLowerCase().startsWith(t))) continue;
            if (rawDesc.length < 3) continue;
            // Guard: a bare number (or "item 12") is an item-ref that leaked into the
            // description column — never a real material. Skip it rather than emit junk.
            if (/^\d+(\.\d+)?$/.test(rawDesc) || /^item\s*\d+$/i.test(rawDesc)) continue;

            const rawQty  = qtyCol  >= 0 ? row[qtyCol]  : null;
            const rawUnit = unitCol >= 0 ? String(row[unitCol] ?? '').trim() : '';
            const parsedQty = parseFloat(String(rawQty ?? '').replace(/[^0-9.]/g, ''));
            const hasQty = Number.isFinite(parsedQty) && parsedQty > 0;
            const hasUnit = rawUnit.length > 0;

            // Section/bill headings switch the trade context, then drop.
            const section = detectSectionContext(rawDesc, { hasQty, hasUnit });
            if (section) {
                activeSection = section.category;
                continue;
            }
            // Guard: remaining structural rows (carried-forward sums, totals)
            // are document scaffolding, not materials.
            if (isStructuralSummaryLine(rawDesc)) continue;

            const qty = parsedQty || 1;

            // Classification precedence:
            // 1. Narrative preamble (site briefs, "the contractor shall…",
            //    rows with neither qty nor unit) → explicit Preliminaries:
            //    honest N/A matrix, never an AI price estimate.
            // 2. A Preliminaries SECTION owns every row in it (P&G sections
            //    contain allowances/services, never retail materials).
            // 3. A keyword on the row itself, high before medium — "water
            //    supply pipes" is Plumbing even inside a Masonry section.
            // 4. The active section's trade (keyword-less material rows).
            // 5. Otherwise tenderCategory stays UNSET — the low-confidence
            //    Preliminaries default must never become an explicit tag,
            //    or the pricing layer bypasses the row to N/A.
            const tenderGuess = guessTenderCategory(rawDesc);
            // Escape hatch on Preliminaries ownership: a row with a real
            // qty + unit AND a high-confidence NON-P&G keyword is a material
            // even if a missed trade boundary left us "inside" Section 1 —
            // without this, one undetected heading un-prices a whole sheet.
            const escapesPrelimOwnership =
                hasQty && hasUnit &&
                tenderGuess.confidence === 'high' &&
                tenderGuess.category !== 'Preliminaries';
            let tenderCategory: BoqCategory | undefined;
            if (isNarrativePreambleLine(rawDesc, { hasQty, hasUnit })) tenderCategory = 'Preliminaries';
            else if (activeSection === 'Preliminaries' && !escapesPrelimOwnership) tenderCategory = 'Preliminaries';
            else if (tenderGuess.confidence !== 'low') tenderCategory = tenderGuess.category;
            else if (activeSection && activeSection !== 'Preliminaries') tenderCategory = activeSection;

            allMaterials.push({
                id: `boq-direct-${sheetName}-${itemIndex++}`,
                name: rawDesc,
                brand: undefined,
                category: mapTenderToLegacyCategory(tenderCategory ?? tenderGuess.category),
                tenderCategory,
                quantity: qty,
                unit: rawUnit || 'unit',
                search_string: generateSearchString(rawDesc),
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

// ─── Search String Generation ─────────────────────────────────────────────────

/**
 * Strips BoQ verbiage from a raw material description
 * and returns a clean search term suitable for SA hardware stores.
 *
 * "Supply and install 50kg PPC Cement CEM II 42.5N including all necessary materials"
 * → "PPC Cement 50kg 42.5N"
 */
export function generateSearchString(rawDescription: string): string {
    let s = rawDescription;

    // 1. Remove common BoQ preamble phrases
    const BOQ_NOISE = [
        /\b(supply\s+and\s+install(ation\s+of)?|supply\s+&\s+install)\b/gi,
        /\b(provide\s+and\s+fix|provide\s+and\s+install|provide)\b/gi,
        /\b(including\s+all\s+necessary\s+(materials?|fixings?|accessories?))\b/gi,
        /\b(as\s+per\s+(specification|drawing|plan|detail)s?)\b/gi,
        /\b(in\s+accordance\s+with)\b/gi,
        /\b(to\s+engineer'?s?\s+detail)\b/gi,
        /\b(complete\s+with\s+all\s+accessories)\b/gi,
        /\b(allow(ance)?\s+for)\b/gi,
        /\b(provisional\s+sum)\b/gi,
        /\b(refer\s+to\s+drawing)\b/gi,
        /\b(measured\s+net|measured)\b/gi,
        /\b(approved\s+equal)\b/gi,
        /\b(or\s+similar|or\s+equivalent|or\s+equal)\b/gi,
        /\b(all\s+as\s+described)\b/gi,
        /\b(rate\s+only|p\.?c\.?\s*sum)\b/gi,
    ];

    for (const re of BOQ_NOISE) {
        s = s.replace(re, ' ');
    }

    // 2. Remove section/clause numbers (e.g. "5.3.1", "A.02")
    s = s.replace(/^[A-Z]?\d+(\.\d+)+\s*/g, '');

    // 3. Remove remaining noise words
    s = s.replace(/\b(the|a|an|to|of|for|with|and|in|on|at|by|per|from|into)\b/gi, ' ');

    // 4. Collapse whitespace
    s = s.replace(/\s+/g, ' ').trim();

    // 5. If the cleaned string is too short/empty, fall back to original
    if (s.length < 4) {
        s = rawDescription.replace(/\s+/g, ' ').trim();
    }

    // 6. Truncate to reasonable search length (max ~80 chars)
    if (s.length > 80) {
        s = s.slice(0, 80).replace(/\s\S*$/, ''); // break at word boundary
    }

    return s;
}

// ─── AI Prompt ────────────────────────────────────────────────────────────────

export const BOQ_EXTRACT_PROMPT = `### ROLE: Tender-grade South African BoQ parser
### OUTPUT CONTRACT (non-negotiable)
Respond with ONLY a JSON object: {"materials": [ one object per BoQ line item ]}

Each line item object:
{
  "item_ref": "the row's billing reference exactly as printed (e.g. '3.2.1', 'A14'), or null",
  "description": "the literal material specification string from the row",
  "qty": 25.0,
  "unit": "m2",
  "category": "exactly one of: Preliminaries, Concrete, Masonry, Structural Steel, Openings, Plumbing, Electrical, Finishes",
  "brand": "brand name if stated, else null"
}

### DATA-INTEGRITY RULES:
1. "description" MUST be the linguistic material/work specification from the row
   (e.g. "20 A Single pole circuit breaker", "Cemcrete Portland Cement 50kg").
   NEVER an item number, row index, or bare section heading. If a row's only
   content is its reference number, SKIP that row entirely.
2. NEVER output a description that equals or merely restates the item_ref.
3. Long procedural preambles ("Supply and install … including all necessary
   fixings …") — keep the material specification, trim the verbiage safely.
4. "category" MUST be one of the 8 listed engineering values, chosen from the
   row itself AND the section/bill heading context above it — rows under
   "ELECTRICAL INSTALLATION" are "Electrical", rows under "PLUMBING: DRAINAGE"
   are "Plumbing", rows under "BUILDERS WORK" are "Masonry". The word "other"
   is FORBIDDEN. If a row is genuinely unclassifiable even with its section
   context, set "category": null — do NOT default it to "Preliminaries".
5. Specs like "30MPa", "42.5N", "CEM II", "Y12" identify grade/type — keep them
   inside the description; NEVER multiply them with quantities.
6. All numbers are plain floats: no currency symbols, no thousands separators.
7. Extract EVERY line item — a 20-item document yields 20 objects. Ignore
   headers, footers, page numbers, totals, and summary rows.`;

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

// ─── Parsed Row → Material Mapping ───────────────────────────────────────────

export interface ParsedRowMapping {
    materials: Material[];
    /** Rows rejected by the tender-grade integrity contract, with reasons. */
    dropped: { row: unknown; reason: string }[];
}

/**
 * Convert raw LLM-extracted rows into validated `Material`s.
 *
 * Enforces the tender-grade contract from `tender-categories.ts`:
 * - drops rows whose description is empty, a bare number, or mirrors the
 *   item reference (the "lazy parse" failure mode);
 * - never emits the category "other" — AI junk reclassifies from the
 *   description, unclassifiable rows resolve to Preliminaries;
 * - labour resolves through the BCCEI estimator so every figure is
 *   audit-traceable (never trusted from the LLM).
 */
export function materialsFromParsedRows(
    parsed: any[],
    opts: { idPrefix?: string; today?: Date } = {},
): ParsedRowMapping {
    const idPrefix = opts.idPrefix ?? 'ai-deepseek';
    const today = opts.today ?? new Date();
    const stamp = today.getTime();

    const materials: Material[] = [];
    const dropped: { row: unknown; reason: string }[] = [];

    // Dynamic section context across the parsed rows (order-preserving):
    // headings the LLM emitted anyway switch the trade for following rows.
    let activeSection: BoqCategory | null = null;

    parsed.forEach((m: any, i: number) => {
        const name = String(m?.description ?? m?.name ?? '').trim();
        const itemRef = m?.item_ref != null ? String(m.item_ref).trim() : undefined;
        const qty = Number(m?.qty ?? m?.quantity) || 1;
        const unit = (String(m?.unit ?? '').trim() || 'unit');

        // Numbered section/bill headings switch context, then drop. (LLM rows
        // always carry a qty default, so caption-shape detection stays off.)
        const section = detectSectionContext(name, { hasQty: true });
        if (section) {
            activeSection = section.category;
            dropped.push({
                row: m,
                reason: `structural section heading — trade context now ${section.category ?? 'unset'}`,
            });
            return;
        }

        // Category junk (including "other") reclassifies from the description
        // instead of dropping an otherwise-valid row.
        let aiCategory: BoqCategory | undefined = isBoqCategory(m?.category) ? m.category : undefined;

        const violation = lineItemViolation({
            itemRef,
            description: name,
            qty,
            unit,
            category: aiCategory,
        });
        if (violation) {
            dropped.push({ row: m, reason: violation });
            return;
        }

        // Structural scaffolding (carried-forward sums, totals) is omitted
        // per the boq_regex_structural_parser skill — it is not a material
        // and must never be priced.
        if (isStructuralSummaryLine(name)) {
            dropped.push({ row: m, reason: 'structural summary/heading line — not a material' });
            return;
        }

        // The LLM historically dumped every unclassifiable row into
        // "Preliminaries", poisoning whole sheets into the N/A bypass.
        // Only trust that label inside a P&G section or when the row's own
        // text reads as P&G with high confidence.
        const rowGuess = guessTenderCategory(name);
        if (
            aiCategory === 'Preliminaries' &&
            activeSection !== 'Preliminaries' &&
            !(rowGuess.category === 'Preliminaries' && rowGuess.confidence === 'high')
        ) {
            aiCategory = undefined;
        }

        // Precedence: narrative preamble → P&G section owns its rows →
        // trusted LLM category → row keyword (high/medium) → section trade →
        // UNSET (priced, never silently bypassed; labour falls back to the
        // Preliminaries grade).
        let tenderCategory: BoqCategory | undefined;
        if (isNarrativePreambleLine(name)) tenderCategory = 'Preliminaries';
        else if (activeSection === 'Preliminaries') tenderCategory = 'Preliminaries';
        else if (aiCategory) tenderCategory = aiCategory;
        else if (rowGuess.confidence !== 'low') tenderCategory = rowGuess.category;
        else if (activeSection) tenderCategory = activeSection;

        const labourCategory: BoqCategory = tenderCategory ?? 'Preliminaries';
        const labour = estimateLabour({ category: labourCategory, qty, unit, today });

        materials.push({
            id: `${idPrefix}-${stamp}-${i}`,
            name,
            brand: m?.brand || undefined,
            category: mapTenderToLegacyCategory(labourCategory),
            tenderCategory,
            quantity: qty,
            unit,
            laborCostEstimate: labour.totalZar,
            search_string: generateSearchString(name),
        });
    });

    return { materials, dropped };
}
