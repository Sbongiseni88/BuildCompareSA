/**
 * Tender-grade BoQ categorisation.
 *
 * Maps an arbitrary material description (or a legacy retail category)
 * into one of the 8 canonical BCCEI categories defined in
 * `src/lib/bccei/labour-defaults.ts`.
 *
 * Never returns `"other"` — the BCCEI labour mapper has no rate row for it
 * and tender bids must carry a defensible category for every line. When
 * a description genuinely cannot be classified, we default to
 * `'Preliminaries'` and surface a `confidence: 'low'` flag in the caller.
 */

import type { BoqCategory } from './bccei/labour-defaults';

export interface TenderCategoryResult {
  category: BoqCategory;
  confidence: 'high' | 'medium' | 'low';
  matchedKeyword?: string;
}

/**
 * Keyword → category lookup. Order matters within a category but not
 * across categories — we score by longest match across all entries.
 */
const TENDER_CATEGORY_KEYWORDS: Record<BoqCategory, string[]> = {
  Preliminaries: [
    'site establishment', 'preliminary', 'preliminaries', 'site clearance',
    'setting out', 'overheads', 'supervision', 'p&g', 'p & g', 'profit',
    'insurance', 'guarantees', 'allow', 'provisional sum', 'contingency',
    'site office', 'temporary works',
  ],
  Concrete: [
    'concrete', 'cement', 'screed', 'plaster', 'mortar', 'grout', 'ppc',
    'afrisam', 'sephaku', 'opc', '50kg cement', 'ready mix', 'readymix',
    'slab', 'beam', 'column', 'foundation', 'footing',
  ],
  Masonry: [
    'brick', 'block', 'masonry', 'maxi', 'nfp', 'fbx', 'stock brick',
    'paver', 'paving', 'building sand', 'plaster sand', 'cement bag',
    'lintel', 'damp proof course', 'dpc',
  ],
  'Structural Steel': [
    'rebar', 'reinforcement', 'y10', 'y12', 'y16', 'y20', 'y25',
    'high tensile', 'mild steel', 'i-beam', 'h-beam', 'channel', 'angle iron',
    'flat bar', 'steel plate', 'square tube', 'rectangular tube',
    'galvanised steel', 'structural steel', 'lintel beam',
  ],
  Openings: [
    'door', 'window', 'frame', 'sill', 'shutter', 'casement', 'sliding',
    'pivot', 'glazing', 'glass', 'sash', 'fanlight', 'gate', 'aluminium frame',
    'security gate', 'burglar bar',
  ],
  Electrical: [
    'circuit breaker', 'mcb', 'rcd', 'distribution board', 'db board',
    'cable', 'wire', 'conduit', 'switch', 'socket', 'plug', 'light fitting',
    'luminaire', 'busbar', 'earth', 'electrical', 'isolator',
    'consumer unit', 'cb', 'sp ', 'dp ', 'tp ', 'amp', 'volt',
  ],
  Plumbing: [
    'pipe', 'plumbing', 'tap', 'mixer', 'valve', 'drain', 'sewer', 'gully',
    'manhole', 'pvc pipe', 'copper pipe', 'galvanised pipe', 'pex', 'hdpe',
    'toilet', 'cistern', 'wc', 'basin', 'bath', 'shower', 'geyser',
    'water meter', 'stop cock', 'isolating valve',
  ],
  Finishes: [
    'paint', 'primer', 'sealer', 'varnish', 'undercoat', 'enamel', 'acrylic',
    'tile', 'tiling', 'ceramic', 'porcelain', 'vinyl', 'laminate', 'carpet',
    'skirting', 'cornice', 'wallpaper', 'ceiling', 'rhinolite', 'gypsum',
    'plaster of paris', 'roof sheet', 'ibr', 'corrugated', 'fascia', 'gutter',
    'downpipe', 'tile adhesive', 'grout',
  ],
};

/**
 * Map a canonical BCCEI category back to the closest legacy retail
 * category. Lets the BoQ pipeline populate the legacy `Material.category`
 * field (UI icons / filters) without ever emitting "other".
 */
export type LegacyMaterialCategory =
  | 'cement' | 'bricks' | 'steel' | 'timber'
  | 'plumbing' | 'electrical' | 'paint' | 'hardware';

export function mapTenderToLegacyCategory(cat: BoqCategory): LegacyMaterialCategory {
  switch (cat) {
    case 'Concrete':          return 'cement';
    case 'Masonry':           return 'bricks';
    case 'Structural Steel':  return 'steel';
    case 'Openings':          return 'timber';
    case 'Plumbing':          return 'plumbing';
    case 'Electrical':        return 'electrical';
    case 'Finishes':          return 'paint';
    case 'Preliminaries':     return 'hardware';
  }
}

/**
 * Map a legacy retail category string (e.g. 'cement', 'bricks') to a
 * canonical BCCEI category. Used during the transitional period while
 * upstream callers still emit the old taxonomy.
 */
export function mapLegacyToTenderCategory(legacy: string): BoqCategory {
  const l = legacy.toLowerCase().trim();
  switch (l) {
    case 'cement':
    case 'concrete':
      return 'Concrete';
    case 'bricks':
    case 'sand':
      return 'Masonry';
    case 'steel':
    case 'reinforcement':
      return 'Structural Steel';
    case 'timber':
    case 'wood':
      return 'Openings';
    case 'roofing':
    case 'tiles':
    case 'paint':
    case 'finishes':
      return 'Finishes';
    case 'plumbing':
      return 'Plumbing';
    case 'electrical':
      return 'Electrical';
    case 'hardware':
      return 'Preliminaries';
    case 'labor':
    case 'labour':
      return 'Preliminaries';
    default:
      return 'Preliminaries';
  }
}

/**
 * Classify a raw BoQ description into a tender category.
 * Scores keyword matches by length — longer, more specific matches win.
 */
export function guessTenderCategory(description: string): TenderCategoryResult {
  const lower = description.toLowerCase();

  let best: { category: BoqCategory; keyword: string } | null = null;

  for (const [cat, kws] of Object.entries(TENDER_CATEGORY_KEYWORDS) as [BoqCategory, string[]][]) {
    for (const kw of kws) {
      if (lower.includes(kw)) {
        if (!best || kw.length > best.keyword.length) {
          best = { category: cat, keyword: kw };
        }
      }
    }
  }

  if (best) {
    const confidence: 'high' | 'medium' = best.keyword.length >= 6 ? 'high' : 'medium';
    return { category: best.category, confidence, matchedKeyword: best.keyword };
  }

  return { category: 'Preliminaries', confidence: 'low' };
}

/**
 * Invariants from `.agent/skills/boq_regex_structural_parser/SKILL.md`.
 * Throws if a parsed line item violates the defensive contract.
 */
export interface LineItemCandidate {
  itemRef?: string;
  description: string;
  qty: number;
  unit: string;
  category?: string;
}

export class BoqLineItemViolation extends Error {
  constructor(public readonly row: LineItemCandidate, public readonly reason: string) {
    super(`BoQ line item violation [${reason}]: ${JSON.stringify(row).slice(0, 200)}`);
    this.name = 'BoqLineItemViolation';
  }
}

const PURE_NUMBER_RE = /^\s*\d+(\.\d+)?\s*$/;
const ITEM_PREFIX_RE = /^item\s*\d+/i;

export function validateLineItem(row: LineItemCandidate): void {
  const desc = (row.description ?? '').trim();
  if (!desc) {
    throw new BoqLineItemViolation(row, 'empty description');
  }
  if (PURE_NUMBER_RE.test(desc)) {
    throw new BoqLineItemViolation(row, 'description is a bare number — likely the item index leaked through');
  }
  if (ITEM_PREFIX_RE.test(desc)) {
    throw new BoqLineItemViolation(row, 'description starts with "item N" — likely a placeholder');
  }
  if (row.itemRef && desc.toLowerCase() === row.itemRef.toLowerCase()) {
    throw new BoqLineItemViolation(row, 'description equals item_ref');
  }
  if (row.category && row.category.toLowerCase() === 'other') {
    throw new BoqLineItemViolation(row, 'category "other" is forbidden — use one of the 8 BCCEI categories');
  }
  if (!Number.isFinite(row.qty) || row.qty <= 0) {
    throw new BoqLineItemViolation(row, 'qty must be a positive finite number');
  }
  if (!row.unit || !row.unit.trim()) {
    throw new BoqLineItemViolation(row, 'unit is required');
  }
}

/**
 * Soft-validate variant — returns null on success or the violation reason
 * for callers that want to drop-and-log rather than throw.
 */
export function lineItemViolation(row: LineItemCandidate): string | null {
  try {
    validateLineItem(row);
    return null;
  } catch (err) {
    return err instanceof BoqLineItemViolation ? err.reason : 'unknown';
  }
}
