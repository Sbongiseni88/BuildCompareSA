/**
 * Tests for the CIDB grading engine — designation parsing and the
 * tender-value limit check that flags over-limit BoQs.
 */

import {
  parseCidbGrading,
  checkCidbCompliance,
  CIDB_TENDER_LIMITS,
} from '../cidb';

describe('parseCidbGrading', () => {
  it.each([
    ['4GB', 4, 'GB'],
    ['7CE', 7, 'CE'],
    ['9ep', 9, 'EP'],
    [' 2 me ', 2, 'ME'],
  ])('parses %s', (raw, grade, cls) => {
    const g = parseCidbGrading(raw);
    expect(g).not.toBeNull();
    expect(g!.grade).toBe(grade);
    expect(g!.classOfWorks).toBe(cls);
    expect(g!.designation).toBe(`${grade}${cls}`);
  });

  it.each(['', '0GB', '10GB', 'GB4', '4XX', '4', null, undefined])(
    'rejects invalid designation %p',
    (raw) => {
      expect(parseCidbGrading(raw as string)).toBeNull();
    },
  );
});

describe('checkCidbCompliance', () => {
  it('flags a BoQ that exceeds the grade limit', () => {
    const check = checkCidbCompliance('4GB', 5_000_000)!;
    expect(check.withinLimit).toBe(false);
    expect(check.limitZar).toBe(CIDB_TENDER_LIMITS[4]);
    expect(check.exceedsByZar).toBe(1_000_000);
    expect(check.message).toContain('exceeds');
  });

  it('passes a BoQ inside the limit', () => {
    const check = checkCidbCompliance('7CE', 25_000_000)!;
    expect(check.withinLimit).toBe(true);
    expect(check.exceedsByZar).toBe(0);
  });

  it('treats the limit boundary as within limit', () => {
    const check = checkCidbCompliance('1GB', 200_000)!;
    expect(check.withinLimit).toBe(true);
  });

  it('grade 9 is unlimited', () => {
    const check = checkCidbCompliance('9CE', 950_000_000)!;
    expect(check.withinLimit).toBe(true);
    expect(check.limitZar).toBeNull();
  });

  it('returns null when no grading is set on the profile', () => {
    expect(checkCidbCompliance(null, 1_000_000)).toBeNull();
    expect(checkCidbCompliance('not-a-grade', 1_000_000)).toBeNull();
  });
});
