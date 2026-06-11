import {
  buildSourcingRows,
  buildSourcingWorkbook,
  SOURCING_FILE_LAYOUT,
} from '@/lib/sourcing-file';
import type { ComparisonResult, Material, PriceQuote } from '@/types';

const FIXED_DATE = new Date(Date.UTC(2026, 5, 9));  // 9 Jun 2026 — Y1

function mat(id: string, name: string, category: Material['category'], qty = 10, unit = 'm²'): Material {
  return { id, name, category, quantity: qty, unit };
}

function quote(store: string, price: number): PriceQuote {
  return {
    supplierId: store,
    supplierName: store,
    supplierLogo: '',
    price,
    inStock: true,
    deliveryFee: 100,
    deliveryDays: 2,
    distance: 5,
    lastUpdated: new Date(),
  };
}

function result(material: Material, quotes: PriceQuote[]): ComparisonResult {
  const sorted = [...quotes].sort((a, b) => a.price - b.price);
  return {
    material,
    quotes,
    bestPrice: sorted[0] ?? null,
    averagePrice: quotes.reduce((s, q) => s + q.price, 0) / quotes.length || 0,
    potentialSavings: 0,
  };
}

const fullMatrix: ComparisonResult[] = [
  result(mat('m1', 'NFP stock brick', 'bricks', 100, 'm²'), [
    quote('builders', 5.20),
    quote('cashbuild', 4.90),
    quote('leroy_merlin', 5.50),
    quote('buco', 5.10),
    quote('buildit', 4.95),
  ]),
  result(mat('m2', 'Y12 high tensile rebar', 'steel', 50, 'lm'), [
    quote('builders', 28.50),
    quote('cashbuild', 27.20),
    quote('leroy_merlin', 29.00),
    quote('buco', 28.10),
    quote('buildit', 27.50),
  ]),
];

describe('buildSourcingRows', () => {
  it('produces one row per comparison result', () => {
    const rows = buildSourcingRows(fullMatrix, FIXED_DATE);
    expect(rows).toHaveLength(2);
  });

  it('maps legacy categories to BCCEI tender categories', () => {
    const rows = buildSourcingRows(fullMatrix, FIXED_DATE);
    expect(rows[0].category).toBe('Masonry');         // bricks → Masonry
    expect(rows[1].category).toBe('Structural Steel'); // steel → Structural Steel
  });

  it('populates all 5 retail price columns from the canonical supplierIds', () => {
    const rows = buildSourcingRows(fullMatrix, FIXED_DATE);
    expect(rows[0].prices.builders).toBe(5.20);
    expect(rows[0].prices.cashbuild).toBe(4.90);
    expect(rows[0].prices.leroy_merlin).toBe(5.50);
    expect(rows[0].prices.buco).toBe(5.10);
    expect(rows[0].prices.buildit).toBe(4.95);
  });

  it('cheapest supplier is the actual minimum from the 5-column matrix', () => {
    const rows = buildSourcingRows(fullMatrix, FIXED_DATE);
    expect(rows[0].cheapestSupplier).toBe('Cashbuild');
    expect(rows[0].cheapestPriceZar).toBe(4.90);
  });

  it('does NOT mirror another store value when one is missing', () => {
    const partial: ComparisonResult[] = [
      result(mat('m1', 'NFP brick', 'bricks', 100, 'm²'), [
        quote('builders', 5.20),
        quote('cashbuild', 4.90),
        // leroy_merlin missing
        quote('buco', 5.10),
        quote('buildit', 4.95),
      ]),
    ];
    const rows = buildSourcingRows(partial, FIXED_DATE);
    expect(rows[0].prices.leroy_merlin).toBeNull();
    // and the others are NOT 4.90 mirrored — they're their own values
    expect(rows[0].prices.builders).toBe(5.20);
    expect(rows[0].prices.buco).toBe(5.10);
  });

  it('labour estimate flows through BCCEI labour mapper (positive ZAR)', () => {
    const rows = buildSourcingRows(fullMatrix, FIXED_DATE);
    // Masonry: 100 m² × 1.5 hr × R66.80 = R10 020
    expect(rows[0].labourEstimateZar).toBeCloseTo(10020.0, 1);
    // Structural Steel: 50 × 0.6 × R86.89 = R2 606.7
    expect(rows[1].labourEstimateZar).toBeCloseTo(2606.7, 1);
  });
});

describe('buildSourcingWorkbook', () => {
  it('places the executive summary in rows 1–5', () => {
    const { aoa } = buildSourcingWorkbook(fullMatrix, {
      projectName: 'Tender Bid #4421',
      generatedAt: FIXED_DATE,
    });
    expect(aoa.length).toBeGreaterThanOrEqual(7);
    expect(aoa[0][0].v).toBe('Tender Bid #4421');
    expect(aoa[1][0].v).toBe('Grand Total (Materials + Labour)');
    expect(aoa[2][0].v).toBe('Total Labour Estimate');
    expect(aoa[3][0].v).toBe('Total Materials (Cheapest)');
    expect(aoa[4][0].v).toMatch(/Generated .* BCCEI Wage Year/);
    expect(aoa[4][0].v).toMatch(/Y1/);
  });

  it('header row uses the 13 canonical columns in order', () => {
    const { aoa } = buildSourcingWorkbook(fullMatrix, { generatedAt: FIXED_DATE });
    const headers = aoa[SOURCING_FILE_LAYOUT.headerRow].map((c) => c.v);
    expect(headers).toEqual([
      'Item Ref',
      'Material Description',
      'Category',
      'Qty',
      'Unit',
      'Builders Warehouse',
      'Cashbuild',
      'Leroy Merlin',
      'BUCO',
      'Build it',
      'Cheapest Supplier',
      'Cheapest Price (ZAR)',
      'Labour Estimate (ZAR)',
    ]);
  });

  it('cheapest supplier cell is prefixed with ⭐ and bolded text', () => {
    const { aoa } = buildSourcingWorkbook(fullMatrix, { generatedAt: FIXED_DATE });
    const dataRow1 = aoa[SOURCING_FILE_LAYOUT.firstDataRow];
    const cheapestCell = dataRow1[10];
    expect(cheapestCell.v).toMatch(/^⭐ /);
    expect(cheapestCell.v).toBe('⭐ Cashbuild');
  });

  it('omits Total Cost / Potential Savings / Detailed Specification columns', () => {
    const { aoa } = buildSourcingWorkbook(fullMatrix, { generatedAt: FIXED_DATE });
    const headers = aoa[SOURCING_FILE_LAYOUT.headerRow].map((c) => c.v);
    expect(headers).not.toContain('Total Cost (ZAR)');
    expect(headers).not.toContain('Potential Savings (ZAR)');
    expect(headers).not.toContain('Detailed Technical Specification');
  });

  it('writes a fully N/A row when no supplier returned a price', () => {
    const noQuotes: ComparisonResult[] = [
      result(mat('m1', 'Mystery material', 'other', 1, 'unit'), []),
    ];
    const { aoa } = buildSourcingWorkbook(noQuotes, { generatedAt: FIXED_DATE });
    const dataRow = aoa[SOURCING_FILE_LAYOUT.firstDataRow];
    for (let col = 5; col <= 9; col++) {
      // money cells become 'N/A' strings when value is null
      expect(dataRow[col].v).toBe('N/A');
    }
    expect(dataRow[10].v).toBe('N/A');                // cheapest supplier
    expect(dataRow[11].v).toBe('N/A');                // cheapest price
    // Labour still resolves (Preliminaries default)
    expect(typeof dataRow[12].v).toBe('number');
  });
});

describe('buildSourcingWorkbook — Tender Rates markup sheet (M4)', () => {
  it('appends a "Tender Rates" sheet only when a markup is set', () => {
    const raw = buildSourcingWorkbook(fullMatrix, { generatedAt: FIXED_DATE });
    expect(raw.workbook.SheetNames).toEqual(['Sourcing File']);

    const marked = buildSourcingWorkbook(fullMatrix, {
      generatedAt: FIXED_DATE,
      markupPercent: 12,
    });
    expect(marked.workbook.SheetNames).toEqual(['Sourcing File', 'Tender Rates']);
  });

  it('sheet 1 raw data is identical with or without markup', () => {
    const raw = buildSourcingWorkbook(fullMatrix, { generatedAt: FIXED_DATE });
    const marked = buildSourcingWorkbook(fullMatrix, {
      generatedAt: FIXED_DATE,
      markupPercent: 12,
    });
    expect(marked.aoa).toEqual(raw.aoa);
  });

  it('tender unit rate = (material + labour/qty) × (1 + margin)', () => {
    const { workbook } = buildSourcingWorkbook(fullMatrix, {
      generatedAt: FIXED_DATE,
      markupPercent: 10,
    });
    const sheet = workbook.Sheets['Tender Rates'];
    // First data row is row 8 (1-indexed): headers live on row 7.
    // Columns: A ref, B desc, C qty, D unit, E material, F labour, G cost, H tender, I line total
    const material = sheet['E8'].v as number;
    const labour = sheet['F8'].v as number;
    const cost = sheet['G8'].v as number;
    const tender = sheet['H8'].v as number;
    expect(cost).toBeCloseTo(material + labour, 6);
    expect(tender).toBeCloseTo(cost * 1.1, 6);
    // m1: cheapest 4.90 + labour 10020/100 = 105.10 → 115.61 at +10%
    expect(material).toBe(4.90);
    expect(tender).toBeCloseTo(105.10 * 1.1, 2);
  });

  it('summary reconciles: tender value − cost basis = gross margin', () => {
    const { workbook } = buildSourcingWorkbook(fullMatrix, {
      generatedAt: FIXED_DATE,
      markupPercent: 12,
    });
    const sheet = workbook.Sheets['Tender Rates'];
    const tenderValue = sheet['B2'].v as number;
    const costBasis = sheet['B3'].v as number;
    const margin = sheet['B4'].v as number;
    expect(margin).toBeCloseTo(tenderValue - costBasis, 6);
    expect(tenderValue).toBeCloseTo(costBasis * 1.12, 6);
  });
});
