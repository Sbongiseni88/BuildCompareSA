/**
 * Tests for the P&G site-services module: service-rate matching for
 * Preliminaries lines (clearly-labelled B2B estimates, never retail
 * quotes) and the percentage-based P&G spread tool.
 */

import {
  matchPgService,
  estimatePgService,
  spreadPgBalance,
} from '../pg-services';

describe('matchPgService', () => {
  it.each([
    ['Allow for site establishment and offices', 'site-office'],
    ['Provide chemical toilets for the duration of the works', 'chemical-toilet'],
    ['Scaffolding to external elevations', 'scaffolding'],
    ['Shoring to existing openings', 'shoring'],
    ['Health and Safety officer as per OHS Act', 'hs-officer'],
    ['Temporary site fencing 1.8m high', 'fencing'],
    ['Allow for site supervision', 'supervision'],
    ['Temporary water and electricity supply', 'temp-services'],
  ])('matches "%s" → %s', (description, serviceId) => {
    expect(matchPgService(description)?.id).toBe(serviceId);
  });

  it('returns null for generic allowances and real materials', () => {
    expect(matchPgService('Provisional sum: contingencies')).toBeNull();
    expect(matchPgService('PPC Surebuild Cement 42.5N 50kg')).toBeNull();
    expect(matchPgService('')).toBeNull();
  });
});

describe('estimatePgService', () => {
  it('prices at the mid-point of the indicative range × qty', () => {
    const est = estimatePgService('Provide chemical toilets', 4)!;
    expect(est.rateZar).toBe((850 + 1500) / 2);
    expect(est.totalZar).toBe(est.rateZar * 4);
    expect(est.qty).toBe(4);
  });

  it('defaults a "sum" line (qty 0 / NaN) to a single billing unit', () => {
    expect(estimatePgService('Site establishment', 0)!.qty).toBe(1);
    expect(estimatePgService('Site establishment', NaN)!.qty).toBe(1);
  });

  it('labels the figure a B2B service estimate, never a retail price', () => {
    const est = estimatePgService('Scaffolding to elevations', 100)!;
    expect(est.basis).toContain('B2B site-services rate');
    expect(est.basis).toContain('not a retail price');
  });

  it('returns null when no service family matches', () => {
    expect(estimatePgService('Y12 rebar 6m', 10)).toBeNull();
  });
});

describe('spreadPgBalance — percentage-based P&G spread tool', () => {
  const rows = [
    { id: 'a', materialValueZar: 6_000 },
    { id: 'b', materialValueZar: 3_000 },
    { id: 'c', materialValueZar: 1_000 },
  ];

  it('allocates proportional to material value', () => {
    const out = spreadPgBalance(10_000, rows);
    expect(out.find((r) => r.id === 'a')!.pgAllocationZar).toBe(6_000);
    expect(out.find((r) => r.id === 'b')!.pgAllocationZar).toBe(3_000);
    expect(out.find((r) => r.id === 'c')!.pgAllocationZar).toBe(1_000);
    expect(out.find((r) => r.id === 'a')!.pgPercent).toBe(60);
  });

  it('reconciles rounding drift so allocations sum exactly to the balance', () => {
    const odd = [
      { id: 'a', materialValueZar: 1 },
      { id: 'b', materialValueZar: 1 },
      { id: 'c', materialValueZar: 1 },
    ];
    const out = spreadPgBalance(100, odd);
    const total = out.reduce((s, r) => s + r.pgAllocationZar, 0);
    expect(Math.round(total * 100) / 100).toBe(100);
  });

  it('gives zero to N/A rows and survives a zero balance', () => {
    const withNa = [...rows, { id: 'na', materialValueZar: 0 }];
    const out = spreadPgBalance(5_000, withNa);
    expect(out.find((r) => r.id === 'na')!.pgAllocationZar).toBe(0);

    const zero = spreadPgBalance(0, rows);
    expect(zero.every((r) => r.pgAllocationZar === 0)).toBe(true);
  });

  it('survives an all-N/A matrix (no division by zero)', () => {
    const out = spreadPgBalance(5_000, [{ id: 'x', materialValueZar: 0 }]);
    expect(out[0].pgAllocationZar).toBe(0);
  });
});
