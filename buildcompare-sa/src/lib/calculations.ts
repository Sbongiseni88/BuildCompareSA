/**
 * Construction calculators (ported to TypeScript from the retired Python
 * calculations module during the tender-pivot refactor).
 *
 * Returns plain-object results suitable for serialisation to the
 * /api/calc/technical handler or for direct UI consumption inside
 * the Smart Estimator.
 */

export type BrickType = 'standard_single' | 'standard_double' | 'maxi';

export interface BricksResult {
  bricksCount: number;
  cementBags50kg: number;
  buildingSandM3: number;
  brickTypeUsed: BrickType;
}

export function calculateBricksNeeded(
  wallAreaSqm: number,
  brickType: BrickType = 'standard_single',
): BricksResult {
  const ratesPerSqm: Record<BrickType, number> = {
    standard_single: 55,
    standard_double: 110,
    maxi: 35,
  };

  const rate = ratesPerSqm[brickType] ?? 55;
  const totalBricks = Math.ceil(wallAreaSqm * rate);

  // SA rule of thumb: 1000 bricks ≈ 3 × 50 kg cement, 0.6 m³ sand
  const cementBags50kg = Math.ceil((totalBricks / 1000) * 3);
  const buildingSandM3 = Math.round((totalBricks / 1000) * 0.6 * 100) / 100;

  return {
    bricksCount: totalBricks,
    cementBags50kg,
    buildingSandM3,
    brickTypeUsed: brickType,
  };
}

export interface PaintResult {
  litresNeeded: number;
  buckets20L: number;
  buckets5L: number;
}

export function calculatePaintLitres(
  wallAreaSqm: number,
  coats: number = 2,
): PaintResult {
  const spreadRateSqmPerLitre = 9;
  const totalLitres = (wallAreaSqm * coats) / spreadRateSqmPerLitre;

  return {
    litresNeeded: Math.round(totalLitres * 10) / 10,
    buckets20L: Math.ceil(totalLitres / 20),
    buckets5L: totalLitres < 20 ? Math.ceil(totalLitres / 5) : 0,
  };
}

export interface RoofTilesResult {
  tilesCount: number;
  underlayRolls: number;
}

export function calculateRoofTiles(roofAreaSqm: number): RoofTilesResult {
  const tilesPerSqm = 11.5;
  const totalTiles = Math.ceil(roofAreaSqm * tilesPerSqm);

  return {
    tilesCount: totalTiles,
    underlayRolls: Math.ceil(roofAreaSqm / 30),
  };
}
