/**
 * Catalogue matcher — joins free-text BoQ lines to the pipeline's scraped
 * product catalogue (scraper/catalogue.json) so price_cache hits actually
 * happen on real documents.
 *
 * The original join was `priceCacheKey(search_string) === material_key`,
 * i.e. the BoQ line had to reduce to the catalogue query VERBATIM. Tender
 * lines never do ("Supply hardwood door frame size 813 x 2032mm" vs
 * "Hardwood Door Frame 813mm"), so the warm cache had a ~0% hit rate and
 * every store column rendered N/A.
 *
 * Matching is deliberately CONSERVATIVE — no fabrication: a catalogue entry
 * matches only when EVERY one of its non-brand tokens appears in the BoQ
 * line (plural/unit-suffix tolerant). The returned price is the real scraped
 * shelf price of the matched canonical product, and callers surface the
 * matched product name for audit. A line that does not name a catalogue
 * product gets NO match — its store columns stay honestly N/A.
 */

import catalogueJson from '../../scraper/catalogue.json';
import { priceCacheKey } from './price-cache';

export interface CatalogueMatch {
    /** price_cache material_key of the matched catalogue product. */
    key: string;
    /** Canonical catalogue search string, for audit labels. */
    query: string;
}

/** Brand tokens are optional in a match: a generic "cement 42,5N 50kg" line
 *  may take the scraped price of a branded canonical product — the price is
 *  still that store's real shelf price, and the audit label names the brand. */
const BRAND_TOKENS = new Set([
    'ppc', 'surebuild', 'afrisam', 'sephaku', 'plascon', 'dulux', 'surfix',
    'all', 'purpose', 'universal',
]);

const STOP_TOKENS = new Set(['and', 'of', 'the', 'for', 'with', 'in', 'to', 'per', 'x', 'no', 'nr']);

interface TokenizedEntry {
    key: string;
    query: string;
    /** Non-brand tokens — ALL must match. */
    required: string[];
}

/** SA decimal commas → points; dimension fusions split ("600x600" → 600, 600). */
function tokenize(text: string): string[] {
    return (text || '')
        .toLowerCase()
        .replace(/(\d),(\d)/g, '$1.$2')
        .replace(/(\d)\s*[x×]\s*(\d)/g, '$1 $2')
        .split(/[^a-z0-9.]+/)
        .map(t => t.replace(/^\.+|\.+$/g, ''))
        .filter(t => t.length >= 2 && !STOP_TOKENS.has(t));
}

const NUM_UNIT_RE = /^(\d+(?:\.\d+)?)(mm|cm|m|m2|m3|kg|g|l|ml|a|n|w|v|micron)?$/;

/** Token equivalence: exact, plural-tolerant, or numeric with an optional
 *  unit suffix on either side ("813mm" matches "813", "50kg" matches "50kg"). */
function tokensMatch(entryTok: string, boqTok: string): boolean {
    if (entryTok === boqTok) return true;
    if (`${entryTok}s` === boqTok || entryTok === `${boqTok}s`) return true;
    const en = entryTok.match(NUM_UNIT_RE);
    const bn = boqTok.match(NUM_UNIT_RE);
    if (en && bn && en[1] === bn[1]) {
        return !en[2] || !bn[2] || en[2] === bn[2];
    }
    return false;
}

const ENTRIES: TokenizedEntry[] = (
    (catalogueJson as { materials: { query: string }[] }).materials ?? []
).map(({ query }) => ({
    key: priceCacheKey(query),
    query,
    required: tokenize(query).filter(t => !BRAND_TOKENS.has(t)),
})).filter(e => e.required.length >= 2);

/**
 * Match a BoQ description / search string to a scraped catalogue product.
 * Returns null unless every required token of some entry appears in the
 * line; ties resolve to the most specific entry (most required tokens).
 */
export function matchCatalogueProduct(boqText: string): CatalogueMatch | null {
    const boqTokens = tokenize(boqText);
    if (boqTokens.length === 0) return null;

    let best: { entry: TokenizedEntry; specificity: number } | null = null;
    for (const entry of ENTRIES) {
        const allPresent = entry.required.every(et => boqTokens.some(bt => tokensMatch(et, bt)));
        if (!allPresent) continue;
        if (!best || entry.required.length > best.specificity) {
            best = { entry, specificity: entry.required.length };
        }
    }
    return best ? { key: best.entry.key, query: best.entry.query } : null;
}
