/**
 * CIDB contractor-grading engine.
 *
 * Grading designations combine a grade (1–9) with a class of works
 * (e.g. "4GB" = Grade 4, General Building; "7CE" = Grade 7, Civil
 * Engineering). Each grade caps the value of public-sector tenders the
 * contractor may be awarded.
 *
 * Tender value limits per cidb Regulations (Reg. 25 ranges, as published
 * on the cidb Register of Contractors). Grade 9 is unlimited. Confirm the
 * latest gazetted ranges before a bid — they are revised periodically.
 */

export type CidbGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Upper tender-value limit (ZAR) per grade. `null` = unlimited (Grade 9). */
export const CIDB_TENDER_LIMITS: Record<CidbGrade, number | null> = {
  1: 200_000,
  2: 650_000,
  3: 2_000_000,
  4: 4_000_000,
  5: 6_500_000,
  6: 13_000_000,
  7: 40_000_000,
  8: 130_000_000,
  9: null,
};

/** Classes of works supported in the profile picker. */
export const CIDB_CLASSES: Record<string, string> = {
  GB: 'General Building',
  CE: 'Civil Engineering',
  EB: 'Electrical Engineering (Building)',
  EP: 'Electrical Engineering (Infrastructure)',
  ME: 'Mechanical Engineering',
  SO: 'Specialist Works',
};

export interface CidbGrading {
  grade: CidbGrade;
  classOfWorks: string;
  /** Canonical designation string, e.g. "4GB". */
  designation: string;
}

/**
 * Parse a designation like "4GB", "7ce" or "9 EP". Returns null for
 * anything that doesn't resolve to a known grade + class.
 */
export function parseCidbGrading(raw: string | null | undefined): CidbGrading | null {
  const m = (raw || '').trim().toUpperCase().match(/^([1-9])\s*([A-Z]{2})$/);
  if (!m) return null;
  const grade = Number(m[1]) as CidbGrade;
  const classOfWorks = m[2];
  if (!(classOfWorks in CIDB_CLASSES)) return null;
  return { grade, classOfWorks, designation: `${grade}${classOfWorks}` };
}

export interface CidbComplianceCheck {
  /** True when the BoQ value fits inside the grade's tender limit. */
  withinLimit: boolean;
  grading: CidbGrading;
  limitZar: number | null;
  boqValueZar: number;
  /** Positive when the BoQ exceeds the limit (the shortfall in capacity). */
  exceedsByZar: number;
  message: string;
}

/**
 * Flag a BoQ whose value exceeds the contractor's CIDB tender limit.
 * Returns null when the designation can't be parsed (no profile set).
 */
export function checkCidbCompliance(
  designation: string | null | undefined,
  boqValueZar: number,
): CidbComplianceCheck | null {
  const grading = parseCidbGrading(designation);
  if (!grading) return null;

  const limitZar = CIDB_TENDER_LIMITS[grading.grade];
  const value = Math.max(0, boqValueZar);

  if (limitZar == null || value <= limitZar) {
    return {
      withinLimit: true,
      grading,
      limitZar,
      boqValueZar: value,
      exceedsByZar: 0,
      message:
        limitZar == null
          ? `Grade ${grading.grade}${grading.classOfWorks} is unlimited — no tender-value cap applies.`
          : `BoQ value is within your Grade ${grading.grade}${grading.classOfWorks} tender limit of R${limitZar.toLocaleString('en-ZA')}.`,
    };
  }

  return {
    withinLimit: false,
    grading,
    limitZar,
    boqValueZar: value,
    exceedsByZar: value - limitZar,
    message:
      `This BoQ (R${Math.round(value).toLocaleString('en-ZA')}) exceeds the Grade ` +
      `${grading.grade}${grading.classOfWorks} tender limit of R${limitZar.toLocaleString('en-ZA')} ` +
      `by R${Math.round(value - limitZar).toLocaleString('en-ZA')}. Consider a joint venture ` +
      `or upgrading your cidb registration before bidding.`,
  };
}
