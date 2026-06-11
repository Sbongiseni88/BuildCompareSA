/**
 * SANS / SABS compliance cross-reference.
 *
 * Deterministic keyword engine that maps a BoQ line description to the
 * SANS standard government tender specifications usually invoke for it
 * (SANS 10400 parts and the product standards they reference). Lines
 * that match get a "SABS Approved Material Required" badge in the UI
 * and exports.
 *
 * Deliberately NOT an LLM call: badges must be reproducible and never
 * hallucinated. The list covers the common material families in SA
 * government BoQs — it flags likely requirements, it does not replace
 * reading the tender's own specification.
 */

export interface SansFlag {
  /** Standard code(s), e.g. "SANS 50197-1". */
  standard: string;
  /** Short human label for the badge tooltip. */
  scope: string;
}

interface SansRule {
  pattern: RegExp;
  flag: SansFlag;
}

/** Order matters — first match wins, so more specific rules come first. */
const SANS_RULES: SansRule[] = [
  { pattern: /\bgeyser|water heater\b/i, flag: { standard: 'SANS 10254', scope: 'Fixed electric storage water heaters' } },
  { pattern: /\brebar|reinforc/i, flag: { standard: 'SANS 920', scope: 'Steel bars for concrete reinforcement' } },
  { pattern: /\bcement\b/i, flag: { standard: 'SANS 50197-1', scope: 'Common cements — SABS mark scheme' } },
  { pattern: /\bconcrete|readymix|ready-mix|mortar|screed\b/i, flag: { standard: 'SANS 10400-B / SANS 2001-CC1', scope: 'Structural concrete works' } },
  { pattern: /\bbrick|block(?:work)?|masonry\b/i, flag: { standard: 'SANS 10400-K / SANS 227', scope: 'Walls and masonry units' } },
  { pattern: /\bstructural steel|steel section|lipped channel|i-?beam|h-?column/i, flag: { standard: 'SANS 2001-CS1', scope: 'Structural steelwork' } },
  { pattern: /\broof(?:ing)? sheet|ibr|corrugated|roof tile|purlin\b/i, flag: { standard: 'SANS 10400-L', scope: 'Roof assemblies' } },
  { pattern: /\bglazing|glass|window|shopfront\b/i, flag: { standard: 'SANS 10400-N', scope: 'Glazing' } },
  { pattern: /\bdistribution board|circuit breaker|earth leakage|cable|conduit|wiring|socket outlet|isolator|light fitting|luminaire\b/i, flag: { standard: 'SANS 10142-1', scope: 'Wiring of premises (electrical COC)' } },
  { pattern: /\bsewer|drain(?:age)?|waste pipe|soil pipe|gully|manhole\b/i, flag: { standard: 'SANS 10400-P', scope: 'Drainage installations' } },
  { pattern: /\b(?:pvc pipe|hdpe|copper pipe|water supply|taps?|valve|cistern|wc pan|basin)\b/i, flag: { standard: 'SANS 10252-1 / SANS 966', scope: 'Water supply installations' } },
  { pattern: /\bstructural timber|sa pine|roof truss|rafter|battens?\b/i, flag: { standard: 'SANS 1783 / SANS 10163', scope: 'Structural timber' } },
  { pattern: /\binsulation|thermal|energy efficiency\b/i, flag: { standard: 'SANS 10400-XA', scope: 'Energy usage in buildings' } },
  { pattern: /\bfire door|fire damper|fire extinguisher|hose reel|sprinkler\b/i, flag: { standard: 'SANS 10400-T', scope: 'Fire protection' } },
];

/**
 * Cross-reference a BoQ description against the SANS keyword matrix.
 * Returns the matched standard, or null when no mandatory-standard
 * material family is recognised (e.g. paint sundries, consumables).
 */
export function checkSansCompliance(description: string | null | undefined): SansFlag | null {
  const text = (description || '').trim();
  if (!text) return null;
  for (const rule of SANS_RULES) {
    if (rule.pattern.test(text)) return rule.flag;
  }
  return null;
}

/** Badge copy used by the UI and exports — single source of truth. */
export const SANS_BADGE_LABEL = 'SABS Approved Material Required';
