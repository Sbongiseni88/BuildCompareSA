import {
  RETAIL_STORES,
  blankMatrix,
  assertSymmetric,
  cheapestQuote,
  type RetailMatrix,
  type RetailQuote,
} from '@/lib/retail-matrix';

const okQuote = (store: typeof RETAIL_STORES[number], price: number): RetailQuote => ({
  store, storeName: store, priceZar: price, status: 'ok', source: 'live-scrape',
});

describe('blankMatrix', () => {
  it('contains all 5 canonical stores', () => {
    const m = blankMatrix();
    expect(Object.keys(m).sort()).toEqual([...RETAIL_STORES].sort());
  });

  it('every column is N/A by default', () => {
    const m = blankMatrix('timeout');
    for (const s of RETAIL_STORES) {
      expect(m[s].priceZar).toBeNull();
      expect(m[s].status).toBe('N/A');
      expect(m[s].reason).toBe('timeout');
    }
  });
});

describe('assertSymmetric', () => {
  it('passes on a fully-populated matrix', () => {
    const m = blankMatrix();
    m.builders = okQuote('builders', 100);
    m.cashbuild = okQuote('cashbuild', 95);
    m.leroy_merlin = okQuote('leroy_merlin', 110);
    m.buco = okQuote('buco', 98);
    m.buildit = okQuote('buildit', 105);
    expect(() => assertSymmetric(m)).not.toThrow();
  });

  it('throws when a store column is missing', () => {
    const partial: Partial<RetailMatrix> = {
      builders: okQuote('builders', 100),
      cashbuild: okQuote('cashbuild', 95),
      leroy_merlin: okQuote('leroy_merlin', 110),
      buco: okQuote('buco', 98),
      // buildit missing
    };
    expect(() => assertSymmetric(partial)).toThrow(/asymmetric/);
    expect(() => assertSymmetric(partial)).toThrow(/buildit/);
  });
});

describe('cheapestQuote', () => {
  it('picks the lowest priced ok-status row', () => {
    const m = blankMatrix();
    m.builders = okQuote('builders', 100);
    m.cashbuild = okQuote('cashbuild', 89);
    m.leroy_merlin = okQuote('leroy_merlin', 110);
    m.buco = okQuote('buco', 95);
    m.buildit = okQuote('buildit', 92);
    const c = cheapestQuote(m);
    expect(c?.store).toBe('cashbuild');
    expect(c?.priceZar).toBe(89);
  });

  it('ignores N/A rows even if they had numbers', () => {
    const m = blankMatrix();
    m.builders = okQuote('builders', 100);
    // cashbuild stays N/A
    m.leroy_merlin = okQuote('leroy_merlin', 80);
    m.buco = okQuote('buco', 95);
    m.buildit = okQuote('buildit', 92);
    expect(cheapestQuote(m)?.store).toBe('leroy_merlin');
  });

  it('returns null when every store is N/A', () => {
    expect(cheapestQuote(blankMatrix('site_down'))).toBeNull();
  });

  it('returns null when only zero/negative prices exist (defensive)', () => {
    const m = blankMatrix();
    m.builders = okQuote('builders', 0);
    m.cashbuild = okQuote('cashbuild', -5);
    m.leroy_merlin = okQuote('leroy_merlin', 0);
    m.buco = okQuote('buco', 0);
    m.buildit = okQuote('buildit', 0);
    expect(cheapestQuote(m)).toBeNull();
  });
});

describe('retail matrix — anti-bias invariant', () => {
  it('failing one store does NOT mirror another store value (skeleton check)', () => {
    // The actual mirror-detection bug we are preventing is in the
    // resolver layer — this test documents the contract: N/A keeps
    // priceZar === null, never some other store's number.
    const m = blankMatrix();
    m.builders = okQuote('builders', 100);
    m.cashbuild = okQuote('cashbuild', 95);
    // leroy_merlin remains N/A
    m.buco = okQuote('buco', 98);
    m.buildit = okQuote('buildit', 102);
    expect(m.leroy_merlin.priceZar).toBeNull();
    expect(m.leroy_merlin.status).toBe('N/A');
  });
});
