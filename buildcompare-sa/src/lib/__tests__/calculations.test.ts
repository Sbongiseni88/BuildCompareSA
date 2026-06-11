import {
  calculateBricksNeeded,
  calculatePaintLitres,
  calculateRoofTiles,
} from '@/lib/calculations';

describe('calculateBricksNeeded', () => {
  it('uses 55 bricks/m² for single skin', () => {
    const r = calculateBricksNeeded(10, 'standard_single');
    expect(r.bricksCount).toBe(550);
    expect(r.brickTypeUsed).toBe('standard_single');
  });

  it('uses 110 bricks/m² for double skin', () => {
    const r = calculateBricksNeeded(10, 'standard_double');
    expect(r.bricksCount).toBe(1100);
  });

  it('uses 35 bricks/m² for maxi bricks', () => {
    const r = calculateBricksNeeded(10, 'maxi');
    expect(r.bricksCount).toBe(350);
  });

  it('derives cement and sand from brick count', () => {
    const r = calculateBricksNeeded(20, 'standard_double');
    expect(r.bricksCount).toBe(2200);
    expect(r.cementBags50kg).toBe(Math.ceil((2200 / 1000) * 3));
    expect(r.buildingSandM3).toBe(Math.round((2200 / 1000) * 0.6 * 100) / 100);
  });

  it('falls back to single-skin rate for unknown type', () => {
    const r = calculateBricksNeeded(10, 'unknown' as never);
    expect(r.bricksCount).toBe(550);
  });
});

describe('calculatePaintLitres', () => {
  it('computes litres for 2 coats at 9 m²/L spread rate', () => {
    const r = calculatePaintLitres(90, 2);
    expect(r.litresNeeded).toBe(20);
  });

  it('returns 5L buckets when total is under 20L', () => {
    const r = calculatePaintLitres(45, 2);
    expect(r.buckets5L).toBeGreaterThan(0);
  });

  it('returns 20L buckets when total is 20+', () => {
    const r = calculatePaintLitres(200, 2);
    expect(r.buckets20L).toBeGreaterThanOrEqual(1);
    expect(r.buckets5L).toBe(0);
  });
});

describe('calculateRoofTiles', () => {
  it('uses 11.5 tiles per m²', () => {
    expect(calculateRoofTiles(100).tilesCount).toBe(1150);
  });

  it('computes underlay rolls at 30 m² each', () => {
    expect(calculateRoofTiles(90).underlayRolls).toBe(3);
  });
});
