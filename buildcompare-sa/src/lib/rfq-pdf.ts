/**
 * Bulk Supplier RFQ (Request for Quotation) generator.
 *
 * Compiles every material line from a priced BoQ search into a formal
 * one-document RFQ a contractor can send to trade desks / bulk-sales
 * departments. Quantities and units come straight from the BoQ; the
 * Unit Price and Total columns are deliberately left BLANK for the
 * supplier to complete — this document never leaks our price intel.
 */

import { jsPDF } from 'jspdf';
import type { ComparisonResult } from '@/types';

export interface RfqOptions {
  projectName?: string;
  /** Contractor / company name shown in the letterhead block. */
  contractorName?: string;
  contactEmail?: string;
  /** Site town for the delivery clause (e.g. "Springs", "Welkom"). */
  deliveryDestination?: string;
  /** Override generation date (for tests). */
  generatedAt?: Date;
}

const YELLOW: [number, number, number] = [234, 179, 8];
const DARK: [number, number, number] = [15, 23, 42];

/**
 * Build and download the RFQ PDF. Returns the file name.
 */
export function downloadBulkRfqPdf(
  results: ComparisonResult[],
  opts: RfqOptions = {},
): string {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = opts.generatedAt ?? new Date();
  const dateLabel = today.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
  const refNo = `RFQ-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  // ── Letterhead ─────────────────────────────────────────────────────
  doc.setFillColor(...YELLOW);
  doc.rect(0, 0, pageWidth, 36, 'F');
  doc.setTextColor(...DARK);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('REQUEST FOR QUOTATION', 14, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ref: ${refNo}  ·  Date: ${dateLabel}`, 14, 26);

  let y = 48;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.contractorName || 'BuildCompare SA Contractor', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  if (opts.projectName) { doc.text(`Project: ${opts.projectName}`, 14, y); y += 5; }
  if (opts.deliveryDestination) { doc.text(`Delivery to site: ${opts.deliveryDestination}`, 14, y); y += 5; }
  if (opts.contactEmail) { doc.text(`Reply to: ${opts.contactEmail}`, 14, y); y += 5; }
  y += 4;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  const intro =
    'Dear Supplier, please provide your best bulk/trade pricing for the materials scheduled below, ' +
    'including availability, lead time and delivered-to-site cost. Quantities are per the project ' +
    'Bill of Quantities. Where applicable, materials must carry the SABS mark / comply with the ' +
    'relevant SANS standard.';
  const introLines = doc.splitTextToSize(intro, pageWidth - 28);
  doc.text(introLines, 14, y);
  y += introLines.length * 4.5 + 8;

  // ── Table header ───────────────────────────────────────────────────
  const drawTableHeader = (yPos: number): number => {
    doc.setFillColor(...YELLOW);
    doc.rect(14, yPos, pageWidth - 28, 9, 'F');
    doc.setTextColor(...DARK);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('#', 16, yPos + 6);
    doc.text('Material Description', 26, yPos + 6);
    doc.text('Qty', 118, yPos + 6);
    doc.text('Unit', 134, yPos + 6);
    doc.text('Unit Price (R)', 152, yPos + 6);
    doc.text('Total (R)', 180, yPos + 6);
    return yPos + 14;
  };

  y = drawTableHeader(y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  results.forEach((res, idx) => {
    if (y > pageHeight - 30) {
      doc.addPage();
      y = drawTableHeader(20);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
    }
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4.5, pageWidth - 28, 8, 'F');
    }
    doc.setFontSize(8);
    doc.text(String(idx + 1).padStart(3, '0'), 16, y);
    doc.text(doc.splitTextToSize(res.material.name, 86)[0] ?? '', 26, y);
    doc.text(`${res.material.quantity}`, 118, y);
    doc.text(res.material.unit || 'unit', 134, y);
    // Unit Price / Total deliberately blank — ruled lines for the supplier.
    doc.setDrawColor(180, 180, 180);
    doc.line(152, y + 1, 174, y + 1);
    doc.line(180, y + 1, 198, y + 1);
    y += 8;
  });

  // ── Closing block ──────────────────────────────────────────────────
  y += 6;
  if (y > pageHeight - 40) { doc.addPage(); y = 24; }
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  const closing =
    'Please return this schedule completed with pricing valid for 30 days, your payment terms, ' +
    'and delivery lead time. Quotations to reference the RFQ number above.';
  const closingLines = doc.splitTextToSize(closing, pageWidth - 28);
  doc.text(closingLines, 14, y);

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated by BuildCompare SA · ${dateLabel}`, 14, pageHeight - 10);

  const fileName = `${refNo}_Supplier_RFQ.pdf`;
  doc.save(fileName);
  return fileName;
}
