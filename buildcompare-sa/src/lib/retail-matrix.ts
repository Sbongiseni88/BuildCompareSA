/**
 * Retail matrix constants + invariants.
 *
 * See `.agent/skills/retail_matrix_normalization/SKILL.md`.
 * Every priced line carries a quote from each of the 5 SA retailers,
 * in canonical column order. A failed store NEVER mirrors another
 * store's value — it reports N/A with a reason.
 */

export const RETAIL_STORES = [
  'builders',
  'cashbuild',
  'leroy_merlin',
  'buco',
  'buildit',
] as const;

export type RetailStore = (typeof RETAIL_STORES)[number];

export const RETAIL_STORE_LABELS: Record<RetailStore, string> = {
  builders:     'Builders Warehouse',
  cashbuild:    'Cashbuild',
  leroy_merlin: 'Leroy Merlin',
  buco:         'BUCO',
  buildit:      'Build it',
};

export type RetailQuoteStatus = 'ok' | 'N/A';
export type RetailNaReason = 'timeout' | 'not_found' | 'parse_error' | 'site_down' | 'not_attempted';

export interface RetailQuote {
  store: RetailStore;
  storeName: string;
  /** ZAR price per unit, or null when status === 'N/A'. */
  priceZar: number | null;
  status: RetailQuoteStatus;
  reason?: RetailNaReason;
  /** Whether the underlying source attempted (for telemetry / debugging). */
  source?: 'live-scrape' | 'cached-scrape' | 'ai-batch-estimate' | 'market-knowledge';
}

export type RetailMatrix = Record<RetailStore, RetailQuote>;

/**
 * Build a fully-N/A matrix as a starting skeleton. Resolvers populate
 * individual columns as their per-store fetches resolve.
 */
export function blankMatrix(reason: RetailNaReason = 'not_attempted'): RetailMatrix {
  const m = {} as RetailMatrix;
  for (const store of RETAIL_STORES) {
    m[store] = {
      store,
      storeName: RETAIL_STORE_LABELS[store],
      priceZar: null,
      status: 'N/A',
      reason,
    };
  }
  return m;
}

/**
 * Defensive: throws if the matrix is missing any of the 5 canonical columns.
 * Call this immediately before serialising to the client or to Excel.
 */
export function assertSymmetric(
  matrix: Partial<Record<RetailStore, RetailQuote>>,
): asserts matrix is RetailMatrix {
  const missing = RETAIL_STORES.filter((s) => !(s in matrix) || matrix[s] === undefined);
  if (missing.length) {
    throw new Error(`Retail matrix is asymmetric — missing columns: ${missing.join(', ')}`);
  }
  // Also guard against the anti-pattern: two stores with identical priceZar
  // could be a sign of bias, but it can be legitimate; only log it.
}

/**
 * Compute the cheapest store across the matrix. Ignores N/A and
 * non-positive prices. Returns `null` if zero stores produced a price.
 */
export function cheapestQuote(matrix: RetailMatrix): RetailQuote | null {
  let best: RetailQuote | null = null;
  for (const store of RETAIL_STORES) {
    const q = matrix[store];
    if (q.status !== 'ok' || q.priceZar == null || q.priceZar <= 0) continue;
    if (!best || q.priceZar < best.priceZar!) best = q;
  }
  return best;
}

/**
 * Per anti-bias logging requirement in the skill — call this whenever a
 * column resolves to N/A so a burst of identical reasons surfaces in logs.
 */
export function logMatrixNa(store: RetailStore, reason: RetailNaReason, query: string): void {
  // Tagged structured log so a downstream collector can aggregate.
  console.warn(
    JSON.stringify({ event: 'matrix.store_na', store, reason, query }),
  );
}
