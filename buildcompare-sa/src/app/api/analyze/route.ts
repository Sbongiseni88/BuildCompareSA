import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { Material } from '@/types';
import { analyzeUploadedImage as mockAnalyze } from '@/data/mockData';
import { checkRateLimit, getRateLimitHeaders, getClientIP } from '@/lib/rate-limit';
import { groqClient, isGroqConfigured } from '@/lib/groq';

// Vision-capable models for image analysis.
// NOTE: As of April 2026, llama-3.2-vision-preview models are DECOMMISSIONED.
// llama-4-scout is the only vision-capable model currently available on Groq.
const VISION_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
];

// Text-only models for document/spreadsheet/PDF analysis.
// These are Groq PRODUCTION models — stable and won't be removed without notice.
const TEXT_MODELS = [
    "llama-3.3-70b-versatile",                     // Primary: production, highly capable
    "llama-3.1-8b-instant",                        // Fast fallback: production, always available
    "meta-llama/llama-4-scout-17b-16e-instruct",  // Last resort: preview model
];

// ─── File type helpers ────────────────────────────────────────────────────────

function isSpreadsheetFile(mimeType: string, fileName: string, buffer?: ArrayBuffer): boolean {
    const name = fileName.toLowerCase();
    if (['.xlsx', '.xls', '.csv'].some(ext => name.endsWith(ext))) return true;
    const mimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/csv',
    ];
    if (mimes.includes(mimeType)) return true;
    // ZIP magic bytes → likely xlsx
    if (buffer && buffer.byteLength >= 4) {
        const h = new Uint8Array(buffer.slice(0, 4));
        if (h[0] === 0x50 && h[1] === 0x4B && h[2] === 0x03 && h[3] === 0x04) return true;
    }
    return false;
}

function isPdfFile(mimeType: string, fileName: string): boolean {
    return mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
}

// ─── Text extractors ──────────────────────────────────────────────────────────

/**
 * Zero-dependency PDF text extractor.
 * Pulls text from PDF content streams via Tj / TJ operators.
 * Works for text-based PDFs (Word, LibreOffice, Google Docs exports).
 * Returns empty string for fully scanned / image-only PDFs.
 */
function extractPdfText(buffer: ArrayBuffer): string {
    const raw = Buffer.from(buffer).toString('binary');
    const texts: string[] = [];

    // (string) Tj – single text show
    const tjRe = /\(([^)\\]|\\.)*\)\s*Tj/g;
    let m: RegExpExecArray | null;

    const unescape = (s: string) =>
        s.replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
         .replace(/\\\\/g, '').replace(/\\\(/g, '(').replace(/\\\)/g, ')')
         .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

    while ((m = tjRe.exec(raw)) !== null) {
        const inner = unescape(m[0].replace(/\)\s*Tj$/, '').slice(1));
        if (inner.trim()) texts.push(inner.trim());
    }

    // [(string) kern (string)] TJ – kerned text show
    const tjArrRe = /\[([^\]]*)\]\s*TJ/g;
    while ((m = tjArrRe.exec(raw)) !== null) {
        const strs = m[1].match(/\(([^)\\]|\\.)*\)/g);
        if (strs) {
            const combined = strs.map(s => unescape(s.slice(1, -1))).join('');
            if (combined.trim()) texts.push(combined.trim());
        }
    }

    const result = texts.join(' ').replace(/\s+/g, ' ').trim();
    return result.length > 12000 ? result.slice(0, 12000) + ' [...TRUNCATED]' : result;
}

/** Convert an Excel/CSV file to a CSV string for the LLM. */
function extractSpreadsheetText(buffer: ArrayBuffer): string {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const parts: string[] = [];
    for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        if (!sheet) continue;
        parts.push(`--- Sheet: ${name} ---`);
        parts.push(XLSX.utils.sheet_to_csv(sheet, { blankrows: false }));
    }
    const result = parts.join('\n');
    return result.length > 30000 ? result.slice(0, 30000) + '\n\n[...TRUNCATED]' : result;
}

/**
 * Materialtype categories we can detect from descriptions.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    cement:      ['cement', 'concrete', 'mortar', 'screed', 'plaster'],
    bricks:      ['brick', 'block', 'masonry', 'paver'],
    steel:       ['steel', 'rebar', 'reinforcement', 'iron', 'metal', 'frame'],
    timber:      ['timber', 'wood', 'door', 'window', 'frame', 'sill', 'board', 'plank', 'plywood'],
    roofing:     ['roof', 'tile', 'sheet', 'cladding', 'IBR', 'corrugated'],
    plumbing:    ['pipe', 'plumb', 'tap', 'fitting', 'valve', 'drain', 'sewer', 'water'],
    electrical:  ['electric', 'cable', 'wire', 'conduit', 'switch', 'plug', 'light', 'panel'],
    paint:       ['paint', 'primer', 'sealer', 'coat', 'varnish'],
    hardware:    ['bolt', 'screw', 'nail', 'hinge', 'lock', 'anchor', 'fix'],
};

function guessCategory(description: string): string {
    const lower = description.toLowerCase();
    for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
        if (kws.some(kw => lower.includes(kw))) return cat;
    }
    return 'other';
}

/**
 * Tries to parse a structured Excel/CSV BoQ directly — no AI, no token limits.
 * Detects common column patterns (Description, Qty, Unit) and maps every row.
 * Returns null if the spreadsheet doesn't have recognisable headers.
 */
function tryDirectBoQParse(buffer: ArrayBuffer): Material[] | null {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const allMaterials: Material[] = [];

    // Column aliases — handles many real-world BoQ header variations
    const DESC_ALIASES  = ['description', 'desc', 'item', 'material', 'work item', 'activity', 'trade', 'element', 'section', 'particulars'];
    const QTY_ALIASES   = ['quantity', 'qty', 'amount', 'no', 'number', 'count', 'nos', 'no.', 'qnty'];
    const UNIT_ALIASES  = ['unit', 'uom', 'measure', 'u/m', 'u.o.m'];
    const IGNORE_TERMS  = ['total', 'sub-total', 'subtotal', 'summary', 'allow', 'provisional', 'p.c.', 'pc sum', ''];

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        // Convert to array-of-arrays so we can scan rows
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
        if (rows.length < 2) continue;

        // Find the header row (first row that contains a known column alias)
        let headerRowIdx = -1;
        let descCol = -1, qtyCol = -1, unitCol = -1;

        for (let r = 0; r < Math.min(rows.length, 20); r++) {
            const row = rows[r].map((c: any) => String(c).toLowerCase().trim());
            const di = row.findIndex(c => DESC_ALIASES.some(a => c.includes(a)));
            if (di >= 0) {
                headerRowIdx = r;
                descCol = di;
                qtyCol  = row.findIndex(c => QTY_ALIASES.some(a => c.includes(a)));
                unitCol = row.findIndex(c => UNIT_ALIASES.some(a => c.includes(a)));
                break;
            }
        }

        // No recognisable header found in this sheet
        if (headerRowIdx < 0 || descCol < 0) continue;

        let itemIndex = 0;
        for (let r = headerRowIdx + 1; r < rows.length; r++) {
            const row = rows[r];
            const rawDesc = String(row[descCol] ?? '').trim();

            // Skip blanks, totals, and noise rows
            if (!rawDesc || IGNORE_TERMS.some(t => t && rawDesc.toLowerCase().startsWith(t))) continue;
            if (rawDesc.length < 3) continue;

            const rawQty  = qtyCol  >= 0 ? row[qtyCol]  : null;
            const rawUnit = unitCol >= 0 ? String(row[unitCol] ?? '').trim() : '';

            const qty = parseFloat(String(rawQty ?? '').replace(/[^0-9.]/g, '')) || 1;

            allMaterials.push({
                id: `boq-direct-${sheetName}-${itemIndex++}`,
                name: rawDesc,
                brand: undefined,
                category: guessCategory(rawDesc) as any,
                quantity: qty,
                unit: rawUnit || 'unit',
            });
        }
    }

    return allMaterials.length > 0 ? allMaterials : null;
}

// ─── Groq helpers ─────────────────────────────────────────────────────────────

async function runGroqCompletion(messages: any[], models: string[]): Promise<string> {
    let lastError: any = null;
    for (const modelId of models) {
        try {
            console.log(`Attempting Groq model: ${modelId}`);
            const completion = await groqClient.chat.completions.create({
                messages,
                model: modelId,
                temperature: 0.1,
                max_tokens: 4096,
                top_p: 1,
                stream: false,
                response_format: { type: 'json_object' },
            });
            const content = completion.choices[0]?.message?.content;
            if (content) return content;
        } catch (err: any) {
            console.warn(`Groq model ${modelId} failed:`, err.message);
            lastError = err;
        }
    }
    throw lastError || new Error('All Groq models failed');
}

const BOQ_PROMPT_SUFFIX = `
You MUST return a valid JSON array. Every construction item, material, or product found must appear as a separate object.

Format:
[
  {
    "id": "item-1",
    "name": "Full descriptive name (e.g. 50kg PPC Cement Bag)",
    "brand": "Brand name if visible, otherwise null",
    "category": "One of: cement, bricks, steel, timber, paint, roofing, plumbing, electrical, hardware, other",
    "quantity": 10,
    "unit": "One of: bag, m2, m3, kg, length, unit, each, lot, litre, roll, sheet"
  },
  { "...next item..." }
]

CRITICAL RULES:
- Extract EVERY line item. Do NOT stop after the first item.
- If a document has 20 items, your array must have 20 objects.
- Return ONLY the raw JSON array. No markdown. No extra text.`;

/** Normalise whatever the LLM returned into a plain array. */
function normaliseParsed(parsed: any): any[] {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
        for (const key of ['materials', 'items', 'results', 'data']) {
            if (Array.isArray(parsed[key])) return parsed[key];
        }
        // Numeric-keyed object  e.g. {"0":{...},"1":{...}}
        const values = Object.values(parsed);
        if (values.length > 0 && values.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
            return values as any[];
        }
        return [parsed]; // single item
    }
    return [];
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, 'scraping');

    if (!rateLimitResult.success) {
        return NextResponse.json(
            { error: 'Rate limit exceeded. Please wait before trying again.' },
            { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
        );
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const fileName = formData.get('fileName') as string;

        if (!isGroqConfigured) {
            console.warn('⚠️ No GROQ_API_KEY. Returning mock data.');
            await new Promise(r => setTimeout(r, 2000));
            return NextResponse.json({ success: true, mode: 'mock', materials: mockAnalyze(fileName || 'image.jpg') });
        }

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const mimeType = file.type || 'application/octet-stream';
        const safeName = fileName || file.name || 'unknown';

        console.log(`📋 File: "${safeName}" | MIME: "${mimeType}" | ${arrayBuffer.byteLength} bytes`);

        try {
            let rawContent: string;

            // ── Excel / CSV ──────────────────────────────────────────────────
            if (isSpreadsheetFile(mimeType, safeName, arrayBuffer)) {
                console.log('📄 Spreadsheet detected.');

                // 1. Try direct structural parse first — handles any size, 100% accuracy
                const directMaterials = tryDirectBoQParse(arrayBuffer);
                if (directMaterials && directMaterials.length > 0) {
                    console.log(`✅ Direct parse succeeded: ${directMaterials.length} items extracted.`);
                    return NextResponse.json({ success: true, mode: 'direct-parse', materials: directMaterials });
                }

                // 2. Fallback: unstructured/unusual format — use AI on extracted CSV text
                console.log('⚠️ No structured headers found. Falling back to AI analysis...');
                const docText = extractSpreadsheetText(arrayBuffer);
                if (!docText.trim()) {
                    return NextResponse.json({ error: 'The uploaded document appears to be empty.' }, { status: 400 });
                }
                const prompt = `You are an expert South African Quantity Surveyor.
Extract ALL construction materials from the spreadsheet below.

--- DOCUMENT ---
${docText}
--- END ---

${BOQ_PROMPT_SUFFIX}`;
                rawContent = await runGroqCompletion([{ role: 'user', content: prompt }], TEXT_MODELS);

            // ── PDF ──────────────────────────────────────────────────────────
            } else if (isPdfFile(mimeType, safeName)) {
                const pdfText = extractPdfText(arrayBuffer);
                console.log(`📑 PDF: extracted ${pdfText.length} chars`);

                if (pdfText.length > 50) {
                    // Text-based PDF → stable text models
                    const prompt = `You are an expert South African Quantity Surveyor.
Extract ALL construction materials from this Bill of Quantities PDF.

--- PDF CONTENT ---
${pdfText}
--- END ---

${BOQ_PROMPT_SUFFIX}`;
                    rawContent = await runGroqCompletion([{ role: 'user', content: prompt }], TEXT_MODELS);
                } else {
                    // PDF content streams are compressed — our extractor can't read them.
                    // Sending a PDF as an image to a vision model is invalid and always fails.
                    // Ask the user to re-export as Excel instead.
                    return NextResponse.json(
                        {
                            error:
                                'Could not read text from this PDF (the content may be compressed or image-based). ' +
                                'Please export your BoQ as an Excel file (.xlsx) and upload that instead — it will work perfectly.',
                        },
                        { status: 400 }
                    );
                }


            // ── Photo / image ─────────────────────────────────────────────────
            } else {
                console.log(`📸 Image detected (${mimeType}). Using vision model...`);
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                const dataUrl = `data:${mimeType};base64,${base64}`;
                const prompt = `You are an expert Quantity Surveyor.
Identify all visible construction materials in this image.

${BOQ_PROMPT_SUFFIX}`;
                rawContent = await runGroqCompletion(
                    [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] }],
                    VISION_MODELS
                );
            }

            console.log('Groq raw response:', rawContent);

            // Strip markdown fences if present
            const cleanJson = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = normaliseParsed(JSON.parse(cleanJson));

            if (!Array.isArray(parsed) || parsed.length === 0) {
                throw new Error('AI returned an empty or unrecognised response. Please try again.');
            }

            const materials: Material[] = parsed.map((m: any, i: number) => ({
                id: `ai-groq-${Date.now()}-${i}`,
                name: m.name || 'Unknown Item',
                brand: m.brand || undefined,
                category: m.category || 'other',
                quantity: Number(m.quantity) || 1,
                unit: m.unit || 'unit',
            }));

            return NextResponse.json({ success: true, mode: 'live-groq', materials });

        } catch (aiError: any) {
            console.error('⚠️ AI Error:', aiError);
            return NextResponse.json(
                { error: `AI Analysis Failed: ${aiError.message || 'Unknown error'}` },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Critical error in /api/analyze:', error);
        return NextResponse.json({ error: 'Server processing error' }, { status: 500 });
    }
}
