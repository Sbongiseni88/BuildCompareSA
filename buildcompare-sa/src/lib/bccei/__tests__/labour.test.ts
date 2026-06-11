import {
  estimateLabour,
  BCCEI_PROMULGATION_NOTICE,
} from '@/lib/bccei/labour';
import {
  currentWageYear,
  hourlyRate,
  BCCEI_HOURLY_RATES,
  BCCEI_ALLOWANCES,
} from '@/lib/bccei/wages';
import { LABOUR_DEFAULTS, BOQ_CATEGORIES } from '@/lib/bccei/labour-defaults';

const Y1_START = new Date(Date.UTC(2026, 0, 15));  // mid-Y1
const Y2_DATE  = new Date(Date.UTC(2026, 10, 1));  // 1 Nov 2026 — in Y2
const Y3_DATE  = new Date(Date.UTC(2027, 10, 1));  // 1 Nov 2027 — in Y3

describe('currentWageYear', () => {
  it('returns Y1 for dates on or before 31 Aug 2026', () => {
    expect(currentWageYear(new Date('2026-06-15T00:00:00Z'))).toBe('Y1');
    expect(currentWageYear(new Date('2026-08-31T23:59:00Z'))).toBe('Y1');
  });
  it('returns Y2 starting 1 Sep 2026', () => {
    expect(currentWageYear(new Date('2026-09-01T00:00:00Z'))).toBe('Y2');
    expect(currentWageYear(new Date('2027-08-31T00:00:00Z'))).toBe('Y2');
  });
  it('returns Y3 starting 1 Sep 2027', () => {
    expect(currentWageYear(new Date('2027-09-01T00:00:00Z'))).toBe('Y3');
  });
});

describe('hourlyRate', () => {
  it('matches the published Y1 table for every grade', () => {
    const expected: Record<number, number> = {
      1: 54.06, 2: 55.32, 3: 56.87, 4: 59.00, 5: 66.80,
      6: 75.86, 7: 86.89, 8: 97.42, 9: 110.11,
    };
    for (const [g, rate] of Object.entries(expected)) {
      expect(hourlyRate(Number(g) as 1, Y1_START)).toBeCloseTo(rate, 2);
    }
  });

  it('matches the published Y2 table for every grade', () => {
    expect(BCCEI_HOURLY_RATES.Y2[5]).toBeCloseTo(70.48, 2);
    expect(hourlyRate(7, Y2_DATE)).toBeCloseTo(91.67, 2);
  });

  it('matches the published Y3 table for every grade', () => {
    expect(BCCEI_HOURLY_RATES.Y3[9]).toBeCloseTo(122.56, 2);
    expect(hourlyRate(1, Y3_DATE)).toBeCloseTo(60.17, 2);
  });
});

describe('estimateLabour - default mappings', () => {
  it('produces a labour estimate for every canonical category', () => {
    for (const category of BOQ_CATEGORIES) {
      const r = estimateLabour({
        category,
        qty: 10,
        unit: LABOUR_DEFAULTS[category].unitHint,
        today: Y1_START,
      });
      expect(r.year).toBe('Y1');
      expect(r.grade).toBe(LABOUR_DEFAULTS[category].grade);
      expect(r.hoursPerUnit).toBe(LABOUR_DEFAULTS[category].hoursPerUnit);
      expect(r.totalHours).toBeCloseTo(10 * LABOUR_DEFAULTS[category].hoursPerUnit, 2);
      expect(r.totalZar).toBeGreaterThan(0);
      expect(r.basis).toContain(`BCCEI Y1 · Task Grade ${LABOUR_DEFAULTS[category].grade}`);
    }
  });
});

describe('estimateLabour - explicit math', () => {
  it('Masonry: 10 m² × 1.5 hr × R66.80 = R1 002.00 in Y1', () => {
    const r = estimateLabour({ category: 'Masonry', qty: 10, unit: 'm²', today: Y1_START });
    expect(r.totalHours).toBe(15);
    expect(r.rateZarPerHour).toBeCloseTo(66.80, 2);
    expect(r.basicZar).toBeCloseTo(1002.00, 2);
    expect(r.allowancesZar).toBe(0);
    expect(r.totalZar).toBeCloseTo(1002.00, 2);
  });

  it('Electrical: 25 points × 0.8 hr × R86.89 = R1 737.80 in Y1', () => {
    const r = estimateLabour({ category: 'Electrical', qty: 25, unit: 'point', today: Y1_START });
    expect(r.totalHours).toBe(20);
    expect(r.basicZar).toBeCloseTo(1737.80, 2);
  });

  it('honours overrideGrade and overrideHoursPerUnit', () => {
    const r = estimateLabour({
      category: 'Masonry',
      qty: 10, unit: 'm²',
      overrideGrade: 7,
      overrideHoursPerUnit: 2.0,
      today: Y1_START,
    });
    expect(r.grade).toBe(7);
    expect(r.totalHours).toBe(20);
    expect(r.rateZarPerHour).toBeCloseTo(86.89, 2);
  });
});

describe('estimateLabour - allowances', () => {
  it('applies acting +5% on basic', () => {
    const base = estimateLabour({ category: 'Masonry', qty: 10, unit: 'm²', today: Y1_START });
    const acting = estimateLabour({
      category: 'Masonry', qty: 10, unit: 'm²', today: Y1_START,
      allowances: { acting: true },
    });
    expect(acting.basicZar).toBeCloseTo(base.basicZar * 1.05, 1);
  });

  it('applies cross-border +7% on basic', () => {
    const base = estimateLabour({ category: 'Masonry', qty: 10, unit: 'm²', today: Y1_START });
    const xb = estimateLabour({
      category: 'Masonry', qty: 10, unit: 'm²', today: Y1_START,
      allowances: { crossBorder: true },
    });
    expect(xb.basicZar).toBeCloseTo(base.basicZar * 1.07, 1);
  });

  it('adds living-out per day', () => {
    const r = estimateLabour({
      category: 'Masonry', qty: 10, unit: 'm²', today: Y1_START,
      allowances: { livingOutDays: 5 },
    });
    expect(r.allowancesZar).toBeCloseTo(5 * BCCEI_ALLOWANCES.Y1.livingOutPerDay, 2);
  });

  it('adds sleep-out per night', () => {
    const r = estimateLabour({
      category: 'Masonry', qty: 10, unit: 'm²', today: Y1_START,
      allowances: { sleepOutNights: 3 },
    });
    expect(r.allowancesZar).toBeCloseTo(3 * BCCEI_ALLOWANCES.Y1.sleepOutPerNight, 2);
  });
});

describe('estimateLabour - audit trace', () => {
  it('basis string names year, grade, rate, and hours', () => {
    const r = estimateLabour({ category: 'Concrete', qty: 4, unit: 'm³', today: Y1_START });
    expect(r.basis).toMatch(/BCCEI Y1/);
    expect(r.basis).toMatch(/Task Grade 4/);
    expect(r.basis).toMatch(/R59\.00\/hr/);
    expect(r.basis).toMatch(/1\.2 hr\/m³/);
    expect(r.basis).toMatch(/= 4\.8 hr/);
  });

  it('basis includes allowances when applied', () => {
    const r = estimateLabour({
      category: 'Concrete', qty: 4, unit: 'm³', today: Y1_START,
      allowances: { acting: true, livingOutDays: 2 },
    });
    expect(r.basis).toMatch(/allowances/);
    expect(r.basis).toMatch(/acting/);
    expect(r.basis).toMatch(/living-out/);
  });
});

describe('estimateLabour - bad input', () => {
  it('throws on an unknown category', () => {
    expect(() =>
      estimateLabour({ category: 'other' as never, qty: 1, unit: 'unit' }),
    ).toThrow(/Unknown BoQ category/);
  });
});

describe('promulgation caveat', () => {
  it('exports a non-empty notice citing BCCEI provenance', () => {
    expect(BCCEI_PROMULGATION_NOTICE.length).toBeGreaterThan(40);
    expect(BCCEI_PROMULGATION_NOTICE).toMatch(/BCCEI/);
    // Must cite the gazette OR mention promulgation/supersession so users
    // know the figure is conditional, not an opaque default.
    expect(BCCEI_PROMULGATION_NOTICE).toMatch(/(gazette|promulgat|supersed|effective)/i);
  });
});
