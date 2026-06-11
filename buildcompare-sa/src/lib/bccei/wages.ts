/**
 * BCCEI Wage & Task Grade Collective Agreement — 2025/2026.
 *
 * Source: Wage & Task Grade Collective Agreement, gazetted as
 *         Gazette 54030 No. R. 7045 and given legal force per the BCCEI
 *         Industry Circular dated 30 January 2026. Effective 2 February 2026
 *         until 31 August 2028. (Verified line-by-line against the circular.)
 *
 * The Y1 schedule applies from the agreement's effective date (2 Feb 2026)
 * through 31 August 2026.
 *
 *   Y1 (+6.0% on prior schedule): 2 Feb 2026 → 31 Aug 2026
 *   Y2 (+5.5% on Y1):             1 Sep 2026 → 31 Aug 2027
 *   Y3 (+5.5% on Y2):             1 Sep 2027 → 31 Aug 2028
 *
 * Caveat: subject to ministerial promulgation. The UI surfaces this caveat
 * alongside every labour estimate; do not strip it.
 */

export type WageYear = 'Y1' | 'Y2' | 'Y3';

export type TaskGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const TASK_GRADES: TaskGrade[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Hourly rate in ZAR by Task Grade and year. */
export const BCCEI_HOURLY_RATES: Record<WageYear, Record<TaskGrade, number>> = {
  Y1: {
    1: 54.06,
    2: 55.32,
    3: 56.87,
    4: 59.00,
    5: 66.80,
    6: 75.86,
    7: 86.89,
    8: 97.42,
    9: 110.11,
  },
  Y2: {
    1: 57.03,
    2: 58.36,
    3: 60.00,
    4: 62.24,
    5: 70.48,
    6: 80.04,
    7: 91.67,
    8: 102.78,
    9: 116.17,
  },
  Y3: {
    1: 60.17,
    2: 61.57,
    3: 63.30,
    4: 65.67,
    5: 74.35,
    6: 84.44,
    7: 96.71,
    8: 108.44,
    9: 122.56,
  },
};

/** Per-period allowances published in the same circular (ZAR). */
export const BCCEI_ALLOWANCES: Record<WageYear, {
  livingOutPerDay: number;
  sleepOutPerNight: number;
  crossBorderPct: number;
  actingPct: number;
}> = {
  Y1: { livingOutPerDay: 1600, sleepOutPerNight: 246.95, crossBorderPct: 0.07, actingPct: 0.05 },
  Y2: { livingOutPerDay: 1700, sleepOutPerNight: 276.95, crossBorderPct: 0.07, actingPct: 0.05 },
  Y3: { livingOutPerDay: 1800, sleepOutPerNight: 306.95, crossBorderPct: 0.07, actingPct: 0.05 },
};

/**
 * Resolve the active wage year for a given date.
 *
 * Year boundaries (per the circular):
 *   Y1 → up to and including 31 August 2026
 *   Y2 → 1 September 2026 → 31 August 2027
 *   Y3 → 1 September 2027 → 31 August 2028
 *
 * Dates outside the agreement window still resolve sensibly: anything
 * before Y1 returns Y1 (rates are still the current minimum), anything
 * after Y3 returns Y3 with a stale flag in the caller.
 */
export function currentWageYear(today: Date = new Date()): WageYear {
  const t = today.getTime();
  // Boundaries — last moment of the year, in UTC to avoid DST surprises.
  const endY1 = Date.UTC(2026, 7, 31, 23, 59, 59); // 31 Aug 2026
  const endY2 = Date.UTC(2027, 7, 31, 23, 59, 59); // 31 Aug 2027
  if (t <= endY1) return 'Y1';
  if (t <= endY2) return 'Y2';
  return 'Y3';
}

/** Hourly rate (ZAR) for a Task Grade in the year active at `today`. */
export function hourlyRate(grade: TaskGrade, today: Date = new Date()): number {
  return BCCEI_HOURLY_RATES[currentWageYear(today)][grade];
}
