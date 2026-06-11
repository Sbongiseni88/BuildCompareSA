/**
 * Tender-grade sourcing file generator.
 *
 * Produces an .xlsx with the exact 13-column matrix mandated by
 * `.agent/rules/team_standards.md`, a 5-row executive dashboard at the
 * top, BCCEI-traceable labour estimates, and ⭐-prefixed cheapest-supplier
 * cells. Used by the "Download Sourcing File" button in PriceSearchHub and
 * the "Save Report" button in ProjectsManager.
 */

import * as XLSX from 'xlsx';
import type { ComparisonResult } from '@/types';
import {
  RETAIL_STORES,
  RETAIL_STORE_LABELS,
  type RetailStore,
} from '@/lib/retail-matrix';
import { estimateLabour } from '@/lib/bccei/labour';
import { currentWageYear } from '@/lib/bccei/wages';
import { isBoqCategory } from '@/lib/bccei/labour-defaults';
import { mapLegacyToTenderCategory, guessTenderCategory } from '@/lib/tender-categories';

export interface SourcingFileOptions {
  projectName?: string;
  /** Override generation date (mostly for snapshot tests). */
  generatedAt?: Date;
  /** Override the active wage year (mostly for snapshot tests). */
  wageYear?: 'Y1' | 'Y2' | 'Y3';
  /** Override the filename (default: `BuildCompareSA_Sourcing_<unix>.xlsx`). */
  fileName?: string;
  /**
   * CIDB markup margin (%). When set, a second "Tender Rates" sheet is
   * appended: sheet 1 keeps the RAW sourcing data untouched; sheet 2
   * carries the marked-up unit rates ready for the bid submission.
   */
  markupPercent?: number;
}

/** Row in the SheetJS array-of-arrays output. Mix of CellObjects and primitives. */
export type SourcingCell = XLSX.CellObject;
export type SourcingAoaRow = SourcingCell[];

export interface SourcingRow {
  itemRef: string;
  description: string;
  category: string;
  qty: number;
  unit: string;
  prices: Record<RetailStore, number | null>;
  cheapestSupplier: string | null;
  cheapestPriceZar: number | null;
  labourEstimateZar: number;
}

const RAND_FORMAT = `_("R"* #,##0.00_);_("R"* (#,##0.00);_("R"* "-"_);_(@_)`;

function asMoneyCell(val: number | null | undefined): XLSX.CellObject {
  if (val == null || !Number.isFinite(val) || val <= 0) {
    return { v: 'N/A', t: 's' };
  }
  return { v: val, t: 'n', z: RAND_FORMAT };
}

function asQtyCell(val: number): XLSX.CellObject {
  return { v: val, t: 'n', z: '#,##0.##' };
}

function asTextCell(val: string): XLSX.CellObject {
  return { v: val, t: 's' };
}

/**
 * Transform a list of ComparisonResults into normalised sourcing rows.
 * Each row's labour figure resolves through `src/lib/bccei/labour.ts` so
 * the value is audit-traceable.
 */
export function buildSourcingRows(
  results: ComparisonResult[],
  today: Date = new Date(),
): SourcingRow[] {
  return results.map((res, idx): SourcingRow => {
    const material = res.material;
    // Order of trust: an explicit tenderCategory from the BoQ pipeline wins;
    // then classification from the description; the legacy field is a last
    // resort. Keeps the export's Category column accurate instead of
    // collapsing every line to one default category.
    const descGuess = guessTenderCategory(material.name || '');
    const tenderCategory = isBoqCategory(material.tenderCategory)
        ? material.tenderCategory
        : descGuess.confidence !== 'low'
            ? descGuess.category
            : mapLegacyToTenderCategory(material.category || 'other');

    const prices = {} as Record<RetailStore, number | null>;
    for (const store of RETAIL_STORES) {
      const q = res.quotes.find((quote) => {
        const id = (quote.supplierId ?? '').toLowerCase().replace(/[\s_-]/g, '');
        const target = store.replace(/[\s_-]/g, '');
        return id === target || id.includes(target);
      });
      prices[store] = q && q.price > 0 ? q.price : null;
    }

    // Cheapest from the 5-store matrix (NOT from res.bestPrice — which may
    // include suppliers outside the canonical 5).
    let cheapestSupplier: string | null = null;
    let cheapestPriceZar: number | null = null;
    for (const store of RETAIL_STORES) {
      const p = prices[store];
      if (p != null && (cheapestPriceZar == null || p < cheapestPriceZar)) {
        cheapestPriceZar = p;
        cheapestSupplier = RETAIL_STORE_LABELS[store];
      }
    }

    const labour = estimateLabour({
      category: tenderCategory,
      qty: material.quantity,
      unit: material.unit || 'unit',
      today,
    });

    return {
      itemRef: `${idx + 1}`.padStart(3, '0'),
      description: material.name,
      category: tenderCategory,
      qty: material.quantity,
      unit: material.unit || 'unit',
      prices,
      cheapestSupplier,
      cheapestPriceZar,
      labourEstimateZar: labour.totalZar,
    };
  });
}

/**
 * Build the SheetJS workbook for the sourcing file. Exposed for snapshot
 * testing without touching the browser download path.
 */
export function buildSourcingWorkbook(
  results: ComparisonResult[],
  opts: SourcingFileOptions = {},
): { workbook: XLSX.WorkBook; rows: SourcingRow[]; aoa: SourcingAoaRow[] } {
  const today = opts.generatedAt ?? new Date();
  const year = opts.wageYear ?? currentWageYear(today);
  const rows = buildSourcingRows(results, today);

  // Totals for the executive summary
  let grandTotalMaterials = 0;
  let grandTotalLabour = 0;
  for (const r of rows) {
    if (r.cheapestPriceZar != null) {
      grandTotalMaterials += r.cheapestPriceZar * r.qty;
    }
    grandTotalLabour += r.labourEstimateZar;
  }
  const grandTotal = grandTotalMaterials + grandTotalLabour;

  const projectName = opts.projectName?.trim() || 'BuildCompare SA — Sourcing File';
  const dateLabel = today.toISOString().split('T')[0];

  const aoa: SourcingAoaRow[] = [];

  // ── Executive dashboard (rows 1–5) ────────────────────────────────
  aoa.push([asTextCell(projectName)]);
  aoa.push([asTextCell('Grand Total (Materials + Labour)'), asMoneyCell(grandTotal)]);
  aoa.push([asTextCell('Total Labour Estimate'), asMoneyCell(grandTotalLabour)]);
  aoa.push([asTextCell('Total Materials (Cheapest)'), asMoneyCell(grandTotalMaterials)]);
  aoa.push([
    asTextCell(`Generated ${dateLabel} · BCCEI Wage Year ${year}`),
  ]);

  // ── Blank separator row 6 ─────────────────────────────────────────
  aoa.push([]);

  // ── Column headers (row 7) ────────────────────────────────────────
  const headers = [
    'Item Ref',
    'Material Description',
    'Category',
    'Qty',
    'Unit',
    RETAIL_STORE_LABELS.builders,
    RETAIL_STORE_LABELS.cashbuild,
    RETAIL_STORE_LABELS.leroy_merlin,
    RETAIL_STORE_LABELS.buco,
    RETAIL_STORE_LABELS.buildit,
    'Cheapest Supplier',
    'Cheapest Price (ZAR)',
    'Labour Estimate (ZAR)',
  ];
  aoa.push(headers.map(asTextCell));

  // ── Data rows ─────────────────────────────────────────────────────
  for (const r of rows) {
    aoa.push([
      asTextCell(r.itemRef),
      asTextCell(r.description),
      asTextCell(r.category),
      asQtyCell(r.qty),
      asTextCell(r.unit),
      asMoneyCell(r.prices.builders),
      asMoneyCell(r.prices.cashbuild),
      asMoneyCell(r.prices.leroy_merlin),
      asMoneyCell(r.prices.buco),
      asMoneyCell(r.prices.buildit),
      asTextCell(r.cheapestSupplier ? `⭐ ${r.cheapestSupplier}` : 'N/A'),
      asMoneyCell(r.cheapestPriceZar),
      asMoneyCell(r.labourEstimateZar),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merge the project name across the matrix width
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 12 } },
  ];

  // Freeze the top 7 rows (summary + headers) so users can scroll the body
  ws['!freeze'] = { xSplit: 0, ySplit: 7 };

  // Column widths
  ws['!cols'] = [
    { wch: 10 },  // A: Item Ref
    { wch: 42 },  // B: Description
    { wch: 18 },  // C: Category
    { wch: 8 },   // D: Qty
    { wch: 10 },  // E: Unit
    { wch: 18 },  // F: Builders Warehouse
    { wch: 16 },  // G: Cashbuild
    { wch: 16 },  // H: Leroy Merlin
    { wch: 14 },  // I: BUCO
    { wch: 14 },  // J: Build it
    { wch: 22 },  // K: Cheapest Supplier
    { wch: 22 },  // L: Cheapest Price (ZAR)
    { wch: 22 },  // M: Labour Estimate (ZAR)
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sourcing File');

  // ── Sheet 2: marked-up tender rates (only when a margin is set) ──────
  const markup = opts.markupPercent;
  if (markup != null && Number.isFinite(markup) && markup > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      buildTenderRatesSheet(rows, markup, projectName, dateLabel),
      'Tender Rates',
    );
  }

  return { workbook: wb, rows, aoa };
}

/**
 * Sheet 2 — "Tender Rates": cost rates from sheet 1 marked up by the CIDB
 * margin. Cost basis = cheapest material unit rate + per-unit labour;
 * tender rate = cost basis × (1 + margin). Lines with no retail price
 * (Preliminaries / N/A) mark up the labour component only.
 */
function buildTenderRatesSheet(
  rows: SourcingRow[],
  markupPercent: number,
  projectName: string,
  dateLabel: string,
): XLSX.WorkSheet {
  const factor = 1 + markupPercent / 100;
  const aoa: SourcingAoaRow[] = [];

  let totalCost = 0;
  let totalTender = 0;

  const body: SourcingAoaRow[] = rows.map((r) => {
    const qty = r.qty > 0 ? r.qty : 1;
    const materialUnit = r.cheapestPriceZar ?? 0;
    const labourUnit = r.labourEstimateZar / qty;
    const costUnit = materialUnit + labourUnit;
    const tenderUnit = costUnit * factor;
    const lineTotal = tenderUnit * qty;

    totalCost += costUnit * qty;
    totalTender += lineTotal;

    return [
      asTextCell(r.itemRef),
      asTextCell(r.description),
      asQtyCell(r.qty),
      asTextCell(r.unit),
      asMoneyCell(materialUnit > 0 ? materialUnit : null),
      asMoneyCell(labourUnit > 0 ? labourUnit : null),
      asMoneyCell(costUnit > 0 ? costUnit : null),
      asMoneyCell(tenderUnit > 0 ? tenderUnit : null),
      asMoneyCell(lineTotal > 0 ? lineTotal : null),
    ];
  });

  const margin = totalTender - totalCost;

  aoa.push([asTextCell(`${projectName} — Tender Rates (+${markupPercent}% margin)`)]);
  aoa.push([asTextCell('Tender Value (marked up)'), asMoneyCell(totalTender)]);
  aoa.push([asTextCell('Cost Basis (raw)'), asMoneyCell(totalCost)]);
  aoa.push([asTextCell('Gross Margin'), asMoneyCell(margin)]);
  aoa.push([asTextCell(`Generated ${dateLabel} · raw sourcing data on sheet 1`)]);
  aoa.push([]);
  aoa.push(
    [
      'Item Ref',
      'Description',
      'Qty',
      'Unit',
      'Material Rate (Cost)',
      'Labour Rate (Cost)',
      'Cost Unit Rate',
      `Tender Unit Rate (+${markupPercent}%)`,
      'Line Total (Tender)',
    ].map(asTextCell),
  );
  aoa.push(...body);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 10 }, { wch: 42 }, { wch: 8 }, { wch: 10 },
    { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 20 },
  ];
  ws['!freeze'] = { xSplit: 0, ySplit: 7 };
  return ws;
}

/**
 * Trigger a browser download of the sourcing file. Returns the resolved
 * file name for telemetry callers.
 */
export function downloadSourcingFile(
  results: ComparisonResult[],
  opts: SourcingFileOptions = {},
): string {
  const { workbook } = buildSourcingWorkbook(results, opts);
  const fileName = opts.fileName || `BuildCompareSA_Sourcing_${Date.now()}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return fileName;
}

/**
 * Frozen header offsets — exposed for tests and downstream styling code.
 */
export const SOURCING_FILE_LAYOUT = {
  /** Row index (0-based) where the column header row lives. */
  headerRow: 6,
  /** Row index (0-based) of the first data row. */
  firstDataRow: 7,
  /** Number of columns in the matrix (Item Ref … Labour). */
  columnCount: 13,
};
