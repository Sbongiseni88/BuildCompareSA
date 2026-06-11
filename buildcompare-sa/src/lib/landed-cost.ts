/**
 * Landed Site Cost calculator.
 *
 * A supplier's shelf price is not what a tender pays — heavy-mass materials
 * (cement, bricks, steel) attract real transport cost, and a marginally
 * cheaper store further from site often loses on the total. This module
 * computes a deterministic landed cost per quote:
 *
 *   landed = shelf total + base delivery + heavy-mass surcharge + distance leg
 *
 * and crowns the cheapest supplier on THAT total, not the shelf price.
 *
 * Honesty constraints: distances come from the caller (live geo when the
 * user shares location; store-profile placeholders otherwise) and every
 * output carries a basis string labelling the delivery figure an estimate.
 * No component of this calculation fabricates a per-store price spread.
 */

import type { Material } from '@/types';
import { guessTenderCategory } from '@/lib/tender-categories';
import { isBoqCategory, type BoqCategory } from '@/lib/bccei/labour-defaults';

/** Categories whose loads price as heavy-mass transport. */
const HEAVY_MASS_CATEGORIES: ReadonlySet<BoqCategory> = new Set([
  'Concrete',
  'Masonry',
  'Structural Steel',
] as BoqCategory[]);

/** Per-km rate for the distance leg beyond the included radius. */
const DISTANCE_RATE_ZAR_PER_KM = 9.5;
/** Radius (km) typically included in a store's base delivery fee. */
const INCLUDED_RADIUS_KM = 10;
/**
 * Heavy-mass surcharge per qty unit — covers crane-truck / 8-ton load
 * handling that light sundries don't need. Applied only to heavy categories.
 */
const HEAVY_MASS_SURCHARGE_ZAR_PER_UNIT = 1.8;
/** Cap the surcharge so very large BoQ quantities read as full loads. */
const HEAVY_MASS_SURCHARGE_CAP_ZAR = 2_500;

const ROUND = (n: number): number => Math.round(n * 100) / 100;

function resolveCategory(material: Pick<Material, 'name' | 'tenderCategory'>): BoqCategory | null {
  if (isBoqCategory(material.tenderCategory)) return material.tenderCategory;
  const guess = guessTenderCategory(material.name || '');
  return guess.confidence !== 'low' ? guess.category : null;
}

export interface LandedCostQuoteInput {
  /** Unit shelf price, ZAR. */
  price: number;
  /** Store's base delivery fee, ZAR (0 = collect). */
  deliveryFeeZar: number;
  /** Distance from site, km. */
  distanceKm: number;
}

export interface LandedCost {
  shelfTotalZar: number;
  deliveryZar: number;
  landedTotalZar: number;
  /** True when the heavy-mass surcharge applied. */
  heavyMass: boolean;
  basis: string;
}

/** Compute the landed site cost for one quote of one material line. */
export function computeLandedCost(
  quote: LandedCostQuoteInput,
  material: Pick<Material, 'name' | 'quantity' | 'tenderCategory'>,
): LandedCost {
  const qty = Number.isFinite(material.quantity) && material.quantity > 0 ? material.quantity : 1;
  const shelfTotal = ROUND(Math.max(0, quote.price) * qty);

  const category = resolveCategory(material);
  const heavyMass = category != null && HEAVY_MASS_CATEGORIES.has(category);

  const base = Math.max(0, quote.deliveryFeeZar || 0);
  const extraKm = Math.max(0, (quote.distanceKm || 0) - INCLUDED_RADIUS_KM);
  const distanceLeg = ROUND(extraKm * DISTANCE_RATE_ZAR_PER_KM);
  const surcharge = heavyMass
    ? ROUND(Math.min(qty * HEAVY_MASS_SURCHARGE_ZAR_PER_UNIT, HEAVY_MASS_SURCHARGE_CAP_ZAR))
    : 0;

  const deliveryZar = ROUND(base + distanceLeg + surcharge);
  const landedTotalZar = ROUND(shelfTotal + deliveryZar);

  const parts = [`base delivery R${base.toFixed(2)}`];
  if (distanceLeg > 0) parts.push(`+ ${extraKm.toFixed(0)}km beyond ${INCLUDED_RADIUS_KM}km @ R${DISTANCE_RATE_ZAR_PER_KM}/km`);
  if (surcharge > 0) parts.push(`+ heavy-mass handling R${surcharge.toFixed(2)}`);

  return {
    shelfTotalZar: shelfTotal,
    deliveryZar,
    landedTotalZar,
    heavyMass,
    basis: `Landed estimate: shelf R${shelfTotal.toFixed(2)} + transport (${parts.join(' ')})`,
  };
}

export interface CrownedQuote<T extends LandedCostQuoteInput> {
  quote: T;
  landed: LandedCost;
}

/**
 * Rank quotes by landed site cost (ascending) and return them with their
 * landed breakdowns. `[0]` is the honest "Cheapest Supplier" — cheapest to
 * get ON SITE, which is what a tender margin actually depends on.
 */
export function crownCheapestByLandedCost<T extends LandedCostQuoteInput>(
  quotes: T[],
  material: Pick<Material, 'name' | 'quantity' | 'tenderCategory'>,
): CrownedQuote<T>[] {
  return quotes
    .map((quote) => ({ quote, landed: computeLandedCost(quote, material) }))
    .sort((a, b) => a.landed.landedTotalZar - b.landed.landedTotalZar);
}
