/**
 * Tests for the Landed Site Cost calculator — the cheapest supplier is
 * crowned on shelf + transport, not shelf price alone.
 */

import { computeLandedCost, crownCheapestByLandedCost } from '../landed-cost';

const cementLine = {
  name: 'PPC Surebuild Cement 42.5N 50kg',
  quantity: 100,
  tenderCategory: 'Concrete' as const,
};

const sundryLine = {
  name: 'Masking tape 48mm',
  quantity: 10,
  tenderCategory: undefined,
};

describe('computeLandedCost', () => {
  it('adds base delivery, distance leg and heavy-mass surcharge for heavy lines', () => {
    const landed = computeLandedCost(
      { price: 100, deliveryFeeZar: 150, distanceKm: 30 },
      cementLine,
    );
    expect(landed.shelfTotalZar).toBe(10_000);
    expect(landed.heavyMass).toBe(true);
    // 150 base + 20km × 9.5 + 100 units × 1.8 surcharge
    expect(landed.deliveryZar).toBe(150 + 20 * 9.5 + 180);
    expect(landed.landedTotalZar).toBe(10_000 + landed.deliveryZar);
    expect(landed.basis).toContain('Landed estimate');
  });

  it('skips the heavy-mass surcharge for light sundries', () => {
    const landed = computeLandedCost(
      { price: 25, deliveryFeeZar: 100, distanceKm: 5 },
      sundryLine,
    );
    expect(landed.heavyMass).toBe(false);
    expect(landed.deliveryZar).toBe(100); // within included radius, no surcharge
  });

  it('caps the heavy-mass surcharge for full-load quantities', () => {
    const landed = computeLandedCost(
      { price: 5, deliveryFeeZar: 0, distanceKm: 0 },
      { ...cementLine, quantity: 10_000 },
    );
    expect(landed.deliveryZar).toBe(2_500);
  });
});

describe('crownCheapestByLandedCost', () => {
  it('a nearer, slightly pricier store beats a far cheap store on landed cost', () => {
    const quotes = [
      { store: 'far-cheap', price: 95, deliveryFeeZar: 350, distanceKm: 60 },
      { store: 'near-fair', price: 99, deliveryFeeZar: 150, distanceKm: 8 },
    ];
    const crowned = crownCheapestByLandedCost(quotes, cementLine);
    // far-cheap: 9500 + (350 + 50×9.5 + 180) = 10505 ; near-fair: 9900 + (150 + 180) = 10230
    expect(crowned[0].quote.store).toBe('near-fair');
    expect(crowned[0].landed.landedTotalZar).toBeLessThan(crowned[1].landed.landedTotalZar);
  });

  it('returns every quote with its landed breakdown, sorted ascending', () => {
    const quotes = [
      { store: 'a', price: 10, deliveryFeeZar: 0, distanceKm: 0 },
      { store: 'b', price: 9, deliveryFeeZar: 0, distanceKm: 0 },
    ];
    const crowned = crownCheapestByLandedCost(quotes, sundryLine);
    expect(crowned).toHaveLength(2);
    expect(crowned[0].quote.store).toBe('b');
  });
});
