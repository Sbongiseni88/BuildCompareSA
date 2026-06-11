---
name: bccei_gazette_labor_mapper
description: Map a BoQ line item to a BCCEI (Bargaining Council for the Civil Engineering Industry) regulated labour cost using the 2025/2026 wage circular. Resolves the active wage year, picks a Task Grade from the line item's category, computes labour hours, and returns an audit-traceable cost breakdown. Use whenever a line item needs a labour-cost component for a tender bid.
---

# BCCEI Labour Mapper

## Source of truth
- BCCEI Industry Circular, 08 August 2025 (Wage & Task Grade Collective Agreement)
- Effective: from ministerial promulgation, valid until 31 August 2028.
- The encoded table lives in `src/lib/bccei/wages.ts`. Re-edit there if the Minister publishes a revision.

## Wage table (ZAR / hour)

| Grade | Y1 (→ 31 Aug 2026) | Y2 (1 Sep 2026 → 31 Aug 2027) | Y3 (1 Sep 2027 → 31 Aug 2028) |
|---|---|---|---|
| 1 | 54.06 | 57.03 | 60.17 |
| 2 | 55.32 | 58.36 | 61.57 |
| 3 | 56.87 | 60.00 | 63.30 |
| 4 | 59.00 | 62.24 | 65.67 |
| 5 | 66.80 | 70.48 | 74.35 |
| 6 | 75.86 | 80.04 | 84.44 |
| 7 | 86.89 | 91.67 | 96.71 |
| 8 | 97.42 | 102.78 | 108.44 |
| 9 | 110.11 | 116.17 | 122.56 |

## Allowances (apply on top of grade hourly when conditions met)
- Living Out: R1 600 / R1 700 / R1 800 (Y1/Y2/Y3) per assignment day
- Sleep Out: R246.95 / R276.95 / R306.95 per night
- Cross-border: +7% on basic
- Acting: +5% on basic

## Default BoQ-category → Task-grade mapping
Opinionated and editable in `src/lib/bccei/labour-defaults.ts`.

| Category | Grade | Default hours-per-unit |
|---|---|---|
| Preliminaries | 3 | 0.5 / unit |
| Concrete | 4 | 1.2 / m³ |
| Masonry | 5 | 1.5 / m² |
| Finishes | 5 | 1.0 / m² |
| Plumbing | 6 | 0.8 / point |
| Openings | 6 | 1.5 / unit |
| Electrical | 7 | 0.8 / point |
| Structural Steel | 7 | 0.6 / kg (per 100) |

## API

```ts
estimateLabour({
  category: BoqCategory,
  qty: number,
  unit: string,
  today?: Date,           // defaults to new Date()
  overrideGrade?: 1|2|3|4|5|6|7|8|9,
  overrideHoursPerUnit?: number,
  allowances?: { livingOut?: boolean; sleepOutNights?: number; crossBorder?: boolean; acting?: boolean }
}) => {
  grade: number;
  hours: number;
  rateZar: number;        // hourly
  basicZar: number;       // hours * rate
  allowancesZar: number;
  totalZar: number;       // basicZar + allowancesZar
  year: 'Y1'|'Y2'|'Y3';
  basis: string;          // human-readable trace
}
```

## Audit obligation
Every output must carry a `basis` string that names the wage year, grade, hours-per-unit assumption, and any allowances applied. State inspectors need this trace.

## Caveat to surface in UI
> BCCEI rates are subject to ministerial promulgation. Confirm site-specific agreements supersede.