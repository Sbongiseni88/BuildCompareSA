---
name: retail_matrix_normalization
description: Enforce that every priced BoQ line carries an independent quote from each of the five SA retailers — Builders Warehouse, Cashbuild, Leroy Merlin, BUCO, and Build it — and that a failed lookup at one store NEVER mirrors another store's value. Use whenever you build the 5-column supplier matrix or compute "Cheapest Supplier".
---

# Retail Matrix Normalization

## Canonical store list (order matters for the export columns)
```ts
export const STORES = ['builders', 'cashbuild', 'leroy_merlin', 'buco', 'buildit'] as const;
export type Store = typeof STORES[number];

export const STORE_LABELS: Record<Store, string> = {
  builders:     'Builders Warehouse',
  cashbuild:    'Cashbuild',
  leroy_merlin: 'Leroy Merlin',
  buco:         'BUCO',
  buildit:      'Build it',
};
```

## Invariants

1. The matrix returned for any line item MUST have all 5 keys present.
2. A failed/missing/timeout response MUST be encoded as:
   ```ts
   { store: 'buco', priceZar: null, status: 'N/A', reason: 'timeout' | 'not_found' | 'parse_error' | 'site_down' }
   ```
3. **Never** fall back to copying another store's price into a missing slot. The anti-pattern this skill exists to prevent:
   ```ts
   // ❌ FORBIDDEN
   if (!quote.buco) quote.buco = quote.cashbuild;
   ```
4. "Cheapest Supplier" is computed only across slots whose `priceZar` is a finite positive number. If fewer than 2 stores returned a price, mark the cheapest with a `confidence: 'low'` flag.

## Defensive assertion (drop into resolver)

```ts
function assertSymmetric(matrix: Partial<Record<Store, Quote>>): asserts matrix is Record<Store, Quote> {
  const missing = STORES.filter(s => !(s in matrix));
  if (missing.length) {
    throw new Error(`Retail matrix missing keys: ${missing.join(', ')}`);
  }
}
```

## Parallel-fetch contract

The resolver MUST `Promise.allSettled` the 5 store calls so a single slow site cannot starve the others. Each store gets its own timeout (default 8 s) and its own retry budget (1 retry). Per-store failures become `N/A` rows; the overall request succeeds as long as **at least one** store returned a price.

## Anti-bias logging

When any store returns `N/A`, log `{ event: 'matrix.store_na', store, reason, query }` at `warn` level. A burst of identical `N/A` reasons for one store across a session is the bug-signature this skill is designed to surface.

## Test obligations

`src/lib/__tests__/batch-price-resolver.test.ts` must include:
- All-5-up case: every column populated.
- One-down case: that one column is `N/A`, the other 4 are independent values, no mirroring.
- All-down case: returns matrix with all five `N/A` and a top-level `status: 'no_quotes'`.