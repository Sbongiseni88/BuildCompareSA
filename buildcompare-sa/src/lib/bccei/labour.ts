/**
 * BCCEI labour estimator.
 *
 * Every line-item labour figure in a tender bid resolves through this
 * function. The output carries a `basis` string that names the wage year,
 * Task Grade, hours-per-unit assumption, and any allowances applied —
 * Department of Employment and Labour inspectors expect this audit trace.
 */

import {
  hourlyRate,
  currentWageYear,
  BCCEI_ALLOWANCES,
  type TaskGrade,
  type WageYear,
} from './wages';
import {
  LABOUR_DEFAULTS,
  normaliseUnit,
  type BoqCategory,
} from './labour-defaults';

export interface LabourAllowances {
  /** Living-out + food allowance, in days. Applied per qty unit by default. */
  livingOutDays?: number;
  /** Sleep-out allowance, in nights. */
  sleepOutNights?: number;
  /** Cross-border project — adds 7% to basic. */
  crossBorder?: boolean;
  /** Acting in a higher grade — adds 5% to basic. */
  acting?: boolean;
}

export interface LabourEstimateInput {
  category: BoqCategory;
  qty: number;
  unit: string;
  today?: Date;
  overrideGrade?: TaskGrade;
  overrideHoursPerUnit?: number;
  allowances?: LabourAllowances;
}

export interface LabourEstimate {
  grade: TaskGrade;
  hoursPerUnit: number;
  totalHours: number;
  rateZarPerHour: number;
  basicZar: number;
  allowancesZar: number;
  totalZar: number;
  year: WageYear;
  basis: string;
}

const ROUND = (n: number): number => Math.round(n * 100) / 100;

export function estimateLabour(input: LabourEstimateInput): LabourEstimate {
  const today = input.today ?? new Date();
  const year = currentWageYear(today);
  const defaults = LABOUR_DEFAULTS[input.category];

  if (!defaults) {
    throw new Error(
      `Unknown BoQ category "${input.category}". ` +
        `Expected one of: ${Object.keys(LABOUR_DEFAULTS).join(', ')}.`,
    );
  }

  const grade = input.overrideGrade ?? defaults.grade;
  const hoursPerUnit = input.overrideHoursPerUnit ?? defaults.hoursPerUnit;
  const rate = hourlyRate(grade, today);
  const qty = Math.max(0, input.qty);

  const totalHours = ROUND(qty * hoursPerUnit);
  let basicZar = ROUND(totalHours * rate);

  // Allowances on the basic rate
  let allowancesZar = 0;
  const al = input.allowances;
  const alYr = BCCEI_ALLOWANCES[year];

  if (al?.acting)       basicZar = ROUND(basicZar * (1 + alYr.actingPct));
  if (al?.crossBorder)  basicZar = ROUND(basicZar * (1 + alYr.crossBorderPct));

  if (al?.livingOutDays && al.livingOutDays > 0) {
    allowancesZar += ROUND(al.livingOutDays * alYr.livingOutPerDay);
  }
  if (al?.sleepOutNights && al.sleepOutNights > 0) {
    allowancesZar += ROUND(al.sleepOutNights * alYr.sleepOutPerNight);
  }

  const totalZar = ROUND(basicZar + allowancesZar);

  const normUnit = normaliseUnit(input.unit);
  const allowanceParts: string[] = [];
  if (al?.acting)       allowanceParts.push(`acting +${(alYr.actingPct * 100).toFixed(0)}%`);
  if (al?.crossBorder)  allowanceParts.push(`cross-border +${(alYr.crossBorderPct * 100).toFixed(0)}%`);
  if (al?.livingOutDays) allowanceParts.push(`living-out ${al.livingOutDays} day(s) @ R${alYr.livingOutPerDay}`);
  if (al?.sleepOutNights) allowanceParts.push(`sleep-out ${al.sleepOutNights} night(s) @ R${alYr.sleepOutPerNight}`);

  const basis =
    `BCCEI ${year} · Task Grade ${grade} @ R${rate.toFixed(2)}/hr · ` +
    `${hoursPerUnit} hr/${normUnit} × ${qty} ${input.unit} = ${totalHours} hr` +
    (allowanceParts.length ? ` + allowances [${allowanceParts.join('; ')}]` : '');

  return {
    grade,
    hoursPerUnit,
    totalHours,
    rateZarPerHour: rate,
    basicZar,
    allowancesZar,
    totalZar,
    year,
    basis,
  };
}

/** UI caveat — surface everywhere a labour figure is displayed. */
export const BCCEI_PROMULGATION_NOTICE =
  'Labour rates derive from the BCCEI Wage & Task Grade Collective Agreement ' +
  '(Gazette 54030 No. R. 7045, effective 2 February 2026 until 31 August 2028). ' +
  'Confirm site-specific agreements supersede before final submission.';
