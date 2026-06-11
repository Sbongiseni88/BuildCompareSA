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

// ─── Section-heading context detection ──────────────────────────────────────
//
// SA tender BoQs are organised into trade sections ("Section No 2: Builders
// Work", "BILL NO 4 - ELECTRICAL INSTALLATION", "PLUMBING: DRAINAGE"). Rows
// inside a section inherit its trade unless their own text says otherwise.
// Without this context, keyword-less rows ("Make good existing surfaces…")
// all collapsed into the low-confidence Preliminaries default — which the
// pricing layer then bypassed, returning N/A for entire documents.

/**
 * Heading-title → trade mapping. Order matters: first match wins.
 *
 * NOTE: deliberately NO rule for "alterations" — a SAPS "Alterations and
 * Additions" BILL spans every trade, and mapping it to Masonry once locked
 * 2,630 rows of a whole document to MASONRY. An unknown-trade numbered
 * heading resets the context instead; subsection captions and row keywords
 * then drive classification.
 */
const SECTION_TRADE_RULES: [RegExp, BoqCategory][] = [
  [/preliminar|preambles?\b|p\s*&\s*g\b|general\s+(?:conditions|requirements)|special\s+conditions/i, 'Preliminaries'],
  [/concrete|formwork|piling/i, 'Concrete'],
  [/structural\s+steel|steel\s*work|metal\s*work|reinforcement/i, 'Structural Steel'],
  [/electrical|small\s+power|lighting|cables?\b|distribution\s+boards?|earthing|lightning\s+protection/i, 'Electrical'],
  [/plumbing|drainage|sanitary|wet\s+services|water\s+supply|pipes?\b|fire\s+(?:installation|services)|water\s+(?:installation|reticulation)/i, 'Plumbing'],
  [/builders?\s+work|brick\s*work|masonry|facing|earth\s*works|excavation/i, 'Masonry'],
  [/carpentry|joinery|doors?\b|windows?\b|glazing|ironmongery/i, 'Openings'],
  [/finish|paint|tiling|ceilings?|floor\s+cover|plastering|roof(?:ing|\s+cover)|waterproofing/i, 'Finishes'],
];

export interface SectionContext {
  /** Trade of the new section, or null for a recognised heading with an
   *  unknown trade (context RESETS — never carries stale state across it). */
  category: BoqCategory | null;
}

/**
 * Detect whether a BoQ row is a SECTION/BILL heading and, if so, which
 * trade context it switches to.
 *
 * Three heading shapes are recognised:
 * 1. Numbered headings — "Section No 2: Builders Work", "BILL NO 4 -
 *    ELECTRICAL INSTALLATION". Always headings.
 * 2. ALL-CAPS trade captions — "PLUMBING: DRAINAGE". Only when the row has
 *    no quantity (`hasQty: false`): a real all-caps item row ("PVC SEWER
 *    PIPE") always carries a qty, a caption never does.
 * 3. Mixed-case trade captions — "Concrete, Formwork and Reinforcement".
 *    The strictest shape: no qty AND no unit, no digits, ≤ 7 words, and it
 *    MUST match a trade rule (a non-matching mixed-case line is treated as
 *    ordinary text, never as a context reset). Documents whose section
 *    boundaries are not all-caps previously never switched context — one
 *    early "Preliminaries" heading then owned all 2,630 rows.
 *
 * Returns null when the row is not a heading (context unchanged).
 */
export function detectSectionContext(
  line: string,
  opts: { hasQty?: boolean; hasUnit?: boolean } = {},
): SectionContext | null {
  const text = (line ?? '').trim();
  if (!text) return null;

  let title: string | null = null;
  let isNumberedHeading = false;

  const numbered = text.match(/^(?:section|bill)\s*(?:no\.?)?\s*\d+\s*[:\-–—]?\s*(.*)$/i);
  if (numbered) {
    title = numbered[1] ?? '';
    isNumberedHeading = true;
  } else if (
    !opts.hasQty &&
    text === text.toUpperCase() &&
    /^[A-Z][A-Z\s&:/().'\-]{3,60}$/.test(text)
  ) {
    title = text;
  } else if (
    opts.hasQty === false &&
    opts.hasUnit === false &&
    !/\d/.test(text) &&
    text.split(/\s+/).length <= 7 &&
    /^[A-Za-z][A-Za-z\s&:,/().'\-]{3,60}$/.test(text)
  ) {
    // Mixed-case captions fall through to the trade rules below; a
    // non-matching one returns null (ordinary text — never a reset).
    title = text;
  }

  if (title == null) return null;

  for (const [re, cat] of SECTION_TRADE_RULES) {
    if (re.test(title)) return { category: cat };
  }
  // A NUMBERED heading with an unknown trade (e.g. "Section No 1 Summary")
  // is a definite boundary — reset the context rather than leak a stale
  // trade forward. An unknown ALL-CAPS caption (a mid-section note like
  // "SUPPLY ONLY") is NOT a boundary — leave the context untouched.
  return isNumberedHeading ? { category: null } : null;
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
