/**
 * Preliminaries & General (P&G) site-operational services module.
 *
 * Preliminaries lines never carry retail prices (the 5-store matrix is an
 * honest N/A — see retail_matrix_normalization). But a tender still has to
 * COST them. This module prices the common P&G allowances against a
 * virtualized B2B service-rate book (plant-hire / site-services market
 * rates, ZAR, 2026), each with an auditable basis string.
 *
 * These are indicative service rates, clearly labelled as such — never
 * presented as retail quotes and never fed into the 5-store matrix.
 *
 * Also home to the percentage-based P&G spread tool: distributes a total
 * P&G balance across material rows proportional to their value, the way
 * estimators conventionally absorb P&G into unit rates.
 */

export interface PgServiceRate {
  id: string;
  label: string;
  /** Billing unit for the rate, e.g. 'month', 'unit/month'. */
  unit: string;
  /** Indicative rate range in ZAR per unit. */
  rateRangeZar: [number, number];
  keywords: RegExp;
}

export const PG_SERVICE_RATES: PgServiceRate[] = [
  {
    id: 'site-office',
    label: 'Site office (container) rental',
    unit: 'month',
    rateRangeZar: [2_500, 4_500],
    keywords: /site (?:office|establishment|camp)|park ?home|container office/i,
  },
  {
    id: 'storage',
    label: 'Secure storage container',
    unit: 'month',
    rateRangeZar: [1_200, 2_500],
    keywords: /storage|store(?:room)? container|lock-?up/i,
  },
  {
    id: 'chemical-toilet',
    label: 'Chemical toilet hire & servicing',
    unit: 'unit/month',
    rateRangeZar: [850, 1_500],
    keywords: /chemical toilet|portable toilet|ablution/i,
  },
  {
    id: 'scaffolding',
    label: 'Scaffolding rental (erected)',
    unit: 'm²/month',
    rateRangeZar: [90, 150],
    keywords: /scaffold/i,
  },
  {
    id: 'shoring',
    label: 'Shoring / propping rental',
    unit: 'prop/month',
    rateRangeZar: [80, 120],
    keywords: /shoring|propping|back ?prop|formwork support/i,
  },
  {
    id: 'hs-officer',
    label: 'Health & Safety officer allowance',
    unit: 'month',
    rateRangeZar: [12_000, 18_000],
    keywords: /health (?:and|&) safety|h\s*&\s*s officer|safety officer|ohs|safety file/i,
  },
  {
    id: 'fencing',
    label: 'Temporary site fencing',
    unit: 'lm/month',
    rateRangeZar: [40, 70],
    keywords: /temporary fenc|site fenc|hoarding/i,
  },
  {
    id: 'security',
    label: 'Site security (per guard post)',
    unit: 'month',
    rateRangeZar: [8_500, 12_000],
    keywords: /security|watchman|guarding/i,
  },
  {
    id: 'temp-services',
    label: 'Temporary water & electricity connections',
    unit: 'month',
    rateRangeZar: [2_000, 5_000],
    keywords: /temporary (?:water|electric|power|services)|water (?:and|&) electricity/i,
  },
  {
    id: 'supervision',
    label: 'Site supervision / agent allowance',
    unit: 'month',
    rateRangeZar: [22_000, 35_000],
    keywords: /supervision|site agent|foreman|general foreman/i,
  },
];

export interface PgServiceEstimate {
  serviceId: string;
  label: string;
  unit: string;
  /** Mid-point indicative rate. */
  rateZar: number;
  rateRangeZar: [number, number];
  qty: number;
  totalZar: number;
  /** Audit trace, e.g. "B2B service rate · Chemical toilet hire …". */
  basis: string;
}

const ROUND = (n: number): number => Math.round(n * 100) / 100;

/**
 * Match a Preliminaries description to a service-rate entry.
 * Returns null when no service applies (generic allowances stay
 * labour-only via the BCCEI estimate).
 */
export function matchPgService(description: string | null | undefined): PgServiceRate | null {
  const text = (description || '').trim();
  if (!text) return null;
  for (const rate of PG_SERVICE_RATES) {
    if (rate.keywords.test(text)) return rate;
  }
  return null;
}

/**
 * Cost a Preliminaries line against the service-rate book. The BoQ qty is
 * interpreted as the billing-unit count (months, units, props…) — a 'sum'
 * line defaults to 1.
 */
export function estimatePgService(
  description: string,
  qty: number = 1,
): PgServiceEstimate | null {
  const service = matchPgService(description);
  if (!service) return null;

  const [min, max] = service.rateRangeZar;
  const rate = ROUND((min + max) / 2);
  const effectiveQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
  const totalZar = ROUND(rate * effectiveQty);

  return {
    serviceId: service.id,
    label: service.label,
    unit: service.unit,
    rateZar: rate,
    rateRangeZar: service.rateRangeZar,
    qty: effectiveQty,
    totalZar,
    basis:
      `B2B site-services rate · ${service.label} @ R${rate.toLocaleString('en-ZA')}/${service.unit} ` +
      `× ${effectiveQty} (indicative range R${min.toLocaleString('en-ZA')}–R${max.toLocaleString('en-ZA')}, ` +
      `not a retail price)`,
  };
}

// ── Percentage-based P&G spread tool ─────────────────────────────────────────

export interface PgSpreadRowInput {
  id: string;
  /** The row's material value (cheapest price × qty), ZAR. */
  materialValueZar: number;
}

export interface PgSpreadAllocation extends PgSpreadRowInput {
  /** Share of the P&G balance allocated to this row, ZAR. */
  pgAllocationZar: number;
  /** The row's share of total material value, as a percentage. */
  pgPercent: number;
}

/**
 * Distribute a total P&G balance across material rows proportional to each
 * row's material value. Allocations sum EXACTLY to the input balance — the
 * rounding remainder lands on the largest row, so the spread reconciles to
 * the cent in the tender summary.
 *
 * Rows with no material value (N/A lines) receive zero.
 */
export function spreadPgBalance(
  pgBalanceZar: number,
  rows: PgSpreadRowInput[],
): PgSpreadAllocation[] {
  const balance = Number.isFinite(pgBalanceZar) ? Math.max(0, pgBalanceZar) : 0;
  const totalValue = rows.reduce(
    (sum, r) => sum + (Number.isFinite(r.materialValueZar) && r.materialValueZar > 0 ? r.materialValueZar : 0),
    0,
  );

  if (balance === 0 || totalValue === 0) {
    return rows.map((r) => ({ ...r, pgAllocationZar: 0, pgPercent: 0 }));
  }

  const out: PgSpreadAllocation[] = rows.map((r) => {
    const value = r.materialValueZar > 0 ? r.materialValueZar : 0;
    const share = value / totalValue;
    return {
      ...r,
      pgAllocationZar: ROUND(balance * share),
      pgPercent: ROUND(share * 100),
    };
  });

  // Reconcile rounding drift onto the largest allocation.
  const allocated = out.reduce((sum, r) => sum + r.pgAllocationZar, 0);
  const drift = ROUND(balance - allocated);
  if (drift !== 0) {
    const largest = out.reduce((a, b) => (b.pgAllocationZar > a.pgAllocationZar ? b : a));
    largest.pgAllocationZar = ROUND(largest.pgAllocationZar + drift);
  }

  return out;
}
