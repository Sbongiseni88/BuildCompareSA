/**
 * Default BoQ-category → BCCEI Task Grade mapping, plus opinionated
 * labour-hours-per-unit defaults.
 *
 * These are starting points only. Site agreements and contractor judgement
 * can override every value through the `overrideGrade` / `overrideHoursPerUnit`
 * options on `estimateLabour()`.
 *
 * The "unit" hint tells the estimator how to interpret the BoQ unit. We
 * accept any unit but normalise common synonyms (m², sqm, m2) to one bucket.
 */

import type { TaskGrade } from './wages';

export type BoqCategory =
  | 'Preliminaries'
  | 'Concrete'
  | 'Masonry'
  | 'Structural Steel'
  | 'Openings'
  | 'Electrical'
  | 'Plumbing'
  | 'Finishes';

export const BOQ_CATEGORIES: BoqCategory[] = [
  'Preliminaries',
  'Concrete',
  'Masonry',
  'Structural Steel',
  'Openings',
  'Electrical',
  'Plumbing',
  'Finishes',
];

/** Type guard for untrusted (AI / legacy) category strings. */
export function isBoqCategory(v: unknown): v is BoqCategory {
  return typeof v === 'string' && (BOQ_CATEGORIES as string[]).includes(v);
}

export interface LabourDefault {
  grade: TaskGrade;
  hoursPerUnit: number;
  /** Human-readable unit the hours-per-unit applies to (for the audit trace). */
  unitHint: string;
}

export const LABOUR_DEFAULTS: Record<BoqCategory, LabourDefault> = {
  Preliminaries:     { grade: 3, hoursPerUnit: 0.5, unitHint: 'unit'   },
  Concrete:          { grade: 4, hoursPerUnit: 1.2, unitHint: 'm³'     },
  Masonry:           { grade: 5, hoursPerUnit: 1.5, unitHint: 'm²'     },
  Finishes:          { grade: 5, hoursPerUnit: 1.0, unitHint: 'm²'     },
  Plumbing:          { grade: 6, hoursPerUnit: 0.8, unitHint: 'point'  },
  Openings:          { grade: 6, hoursPerUnit: 1.5, unitHint: 'unit'   },
  Electrical:        { grade: 7, hoursPerUnit: 0.8, unitHint: 'point'  },
  'Structural Steel':{ grade: 7, hoursPerUnit: 0.6, unitHint: 'kg/100' },
};

/**
 * Normalise common SA-construction unit synonyms.
 * Used to spot when the BoQ unit and the default's unit hint match,
 * so we can fall back to a generic per-unit assumption gracefully.
 */
export function normaliseUnit(raw: string): string {
  const u = raw.trim().toLowerCase().replace(/\./g, '');
  if (/^m2|m²|sqm|sq m$/.test(u)) return 'm²';
  if (/^m3|m³|cum|cu m$/.test(u)) return 'm³';
  if (/^lm|linm|linear m|lin m$/.test(u)) return 'lm';
  if (/^no|nr|each|item|unit|pcs?$/.test(u)) return 'unit';
  if (/^kg|kilogram$/.test(u)) return 'kg';
  if (/^point|pt$/.test(u)) return 'point';
  return u;
}
