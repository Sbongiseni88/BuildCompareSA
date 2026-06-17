import {
  detectSectionContext,
  guessTenderCategory,
  mapLegacyToTenderCategory,
  validateLineItem,
  lineItemViolation,
  BoqLineItemViolation,
} from '@/lib/tender-categories';

describe('guessTenderCategory', () => {
  it('classifies real BoQ descriptions into the 8 categories', () => {
    const cases: Array<[string, string]> = [
      ['Cemcrete Portland Cement 50kg bag', 'Concrete'],
      ['NFP stock brick laid in cement mortar', 'Masonry'],
      ['Y12 high tensile rebar 6m length', 'Structural Steel'],
      ['Hardwood window frame 1200x900', 'Openings'],
      ['20A Single pole MCB circuit breaker', 'Electrical'],
      ['PVC pipe 110mm sewer drain', 'Plumbing'],
      ['Plascon Velvaglo interior acrylic paint 5L', 'Finishes'],
      ['Site establishment and overheads', 'Preliminaries'],
    ];
    for (const [desc, expected] of cases) {
      const r = guessTenderCategory(desc);
      expect(r.category).toBe(expected);
      expect(r.confidence).not.toBe('low');
    }
  });

  it('returns confidence "low" with Preliminaries fallback when nothing matches', () => {
    const r = guessTenderCategory('zzz unknowable widget xxx');
    expect(r.category).toBe('Preliminaries');
    expect(r.confidence).toBe('low');
  });

  it('never returns "other" — that string is not a valid category', () => {
    const samples = ['xyz', 'item 1', 'subtotal', 'page 5', ''];
    for (const s of samples) {
      const r = guessTenderCategory(s);
      expect(r.category).not.toBe('other' as never);
    }
  });
});

describe('mapLegacyToTenderCategory', () => {
  it('maps legacy retail categories onto BCCEI categories', () => {
    expect(mapLegacyToTenderCategory('cement')).toBe('Concrete');
    expect(mapLegacyToTenderCategory('bricks')).toBe('Masonry');
    expect(mapLegacyToTenderCategory('steel')).toBe('Structural Steel');
    expect(mapLegacyToTenderCategory('timber')).toBe('Openings');
    expect(mapLegacyToTenderCategory('paint')).toBe('Finishes');
    expect(mapLegacyToTenderCategory('roofing')).toBe('Finishes');
    expect(mapLegacyToTenderCategory('plumbing')).toBe('Plumbing');
    expect(mapLegacyToTenderCategory('electrical')).toBe('Electrical');
  });

  it('defaults unknown legacy strings to Preliminaries', () => {
    expect(mapLegacyToTenderCategory('whatever')).toBe('Preliminaries');
    expect(mapLegacyToTenderCategory('other')).toBe('Preliminaries');
  });
});

describe('validateLineItem', () => {
  const valid = {
    itemRef: '1.01',
    description: 'PPC OPC Cement 50kg',
    qty: 100,
    unit: 'bag',
    category: 'Concrete',
  };

  it('passes for a well-formed row', () => {
    expect(() => validateLineItem(valid)).not.toThrow();
  });

  it('rejects empty description', () => {
    expect(() => validateLineItem({ ...valid, description: '' })).toThrow(BoqLineItemViolation);
  });

  it('rejects bare-number description (item index leaked through)', () => {
    expect(() => validateLineItem({ ...valid, description: '1.01' })).toThrow(/bare number/);
  });

  it('rejects description matching the item ref', () => {
    expect(() => validateLineItem({ ...valid, description: '1.01', itemRef: '1.01' })).toThrow();
  });

  it('rejects "item N" placeholder descriptions', () => {
    expect(() => validateLineItem({ ...valid, description: 'Item 5' })).toThrow(/placeholder/);
  });

  it('rejects category "other"', () => {
    expect(() => validateLineItem({ ...valid, category: 'other' })).toThrow(/forbidden/);
  });

  it('rejects qty <= 0 and non-finite', () => {
    expect(() => validateLineItem({ ...valid, qty: 0 })).toThrow();
    expect(() => validateLineItem({ ...valid, qty: NaN })).toThrow();
  });

  it('rejects empty unit', () => {
    expect(() => validateLineItem({ ...valid, unit: '' })).toThrow();
  });
});

describe('lineItemViolation (soft variant)', () => {
  it('returns null on success', () => {
    expect(lineItemViolation({
      itemRef: '1', description: 'Cement 50kg', qty: 10, unit: 'bag', category: 'Concrete',
    })).toBeNull();
  });

  it('returns a non-empty reason string on failure', () => {
    expect(lineItemViolation({
      description: '1', qty: 10, unit: 'bag',
    })).toMatch(/bare number/);
  });
});

// ── Regressions from the live SAPS WELKOM document (2,961 rows) ──────────────

describe('keyword matching — word boundaries (substring poison regression)', () => {
  it.each([
    ['Ramps, etc.', 'Electrical'],                       // 'amp' matched "Ramps"
    ['In ramp', 'Electrical'],
    ['Sloping ramps not exceeding 1:10', 'Electrical'],
    ['Earth filling obtained from the excavations', 'Electrical'], // 'earth' matched soil
    ['Masking tape to edges', 'Plumbing'],               // 'tap' matched "tape"
    ['19mm crushed stone aggregate', 'Openings'],        // 'gate' matched "aggregate"
  ])('"%s" must NOT classify as %s', (text, wrongCategory) => {
    const r = guessTenderCategory(text);
    expect(r.confidence === 'low' || r.category !== wrongCategory).toBe(true);
  });

  it.each([
    ['20 amp double pole isolator', 'Electrical'],
    ['Earthing and lightning protection conductor', 'Electrical'],
    ['Chromium plated taps', 'Plumbing'],
    ['Steel security gate 900mm', 'Openings'],
    ['Allowance for testing materials', 'Preliminaries'],
  ])('"%s" still classifies as %s', (text, category) => {
    const r = guessTenderCategory(text);
    expect(r.category).toBe(category);
    expect(r.confidence).not.toBe('low');
  });
});

describe('detectSectionContext — preamble markers and spec prose', () => {
  const caption = { hasQty: false, hasUnit: false };

  it.each(['PREAMBLES', 'Preambles', 'SUPPLEMENTARY PREAMBLES', 'SUPPLEMENTARY PREAMBLES:',
    'For Preambles refer to "Specification of Materials PW 371"'])(
    '"%s" is never a section boundary (context flows through)', (text) => {
      expect(detectSectionContext(text, caption)).toBeNull();
    },
  );

  it('a real numbered Preliminaries heading still switches the section', () => {
    expect(detectSectionContext('Section No 1: Preliminaries', caption))
      .toEqual({ category: 'Preliminaries' });
  });

  it('spec prose quoting a section number is NOT a heading reset', () => {
    // This live row reset the Electrical context for 450+ following rows.
    expect(detectSectionContext(
      'Section 1 with 30% spare space and Light Orange cover plate:', caption,
    )).toBeNull();
  });

  it('numbered headings with separators or ALL-CAPS continuations still detect', () => {
    expect(detectSectionContext('BILL NO 4 - ELECTRICAL INSTALLATION', caption))
      .toEqual({ category: 'Electrical' });
    expect(detectSectionContext('SECTION 2 BILL NO.1 CARRIED TO SUMMARY', caption))
      .toEqual({ category: null });
  });
});
