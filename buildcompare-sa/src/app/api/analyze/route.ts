import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { Material } from '@/types';
import { analyzeUploadedImage as mockAnalyze } from '@/data/mockData';
import { checkRateLimit, getRateLimitHeaders, getClientIP } from '@/lib/rate-limit';
import { groqClient, isGroqConfigured } from '@/lib/groq';

// Vision-capable models for image and PDF analysis.
// NOTE: As of April 2026, llama-3.2-vision-preview models are DECOMMISSIONED.
// llama-4-scout is the only vision-capable model currently available on Groq.
const VISION_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",  // Only active vision model on Groq
];

// Text-only models for spreadsheet/CSV/document analysis.
// These are Groq PRODUCTION models — stable and guaranteed not to be removed without notice.
const TEXT_MODELS = [
    "llama-3.3-70b-versatile",                    // Primary: production, highly capable
    "llama-3.1-8b-instant",                       // Fast fallback: production, always available
    "meta-llama/llama-4-scout-17b-16e-instruct", // Last resort: preview model
];

// Is this file a spreadsheet or CSV?
function isDocumentFile(mimeType: string, fileName: string, buffer?: ArrayBuffer): boolean {
    const lowerName = fileName.toLowerCase();

    // Check extension first — browsers sometimes lie about MIME types
    const docExtensions = ['.xlsx', '.xls', '.csv'];
    if (docExtensions.some(ext => lowerName.endsWith(ext))) return true;

    // Also check MIME type
    const docMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/csv',
    ];
    if (docMimes.includes(mimeType)) return true;

    // Last resort: check for ZIP magic bytes (xlsx files are zipped)
    if (buffer && buffer.byteLength >= 4) {
        const header = new Uint8Array(buffer.slice(0, 4));
        if (header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04) {
            return true; // ZIP-based file (likely xlsx)
        }
    }

    return false;
}

// Is this file a PDF?
function isPdfFile(mimeType: string, fileName: string): boolean {
    return mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
}

// Turn an Excel/CSV file into plain text for the LLM
function parseSpreadsheetToText(buffer: ArrayBuffer, fileName: string): string {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const allText: string[] = [];

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        allText.push(`--- Sheet: ${sheetName} ---`);

        // CSV preserves table structure well enough for the model to understand
        const csvText = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
        allText.push(csvText);
    }

    const result = allText.join('\n');

    // Don't blow the context window
    const MAX_CHARS = 12000;
    if (result.length > MAX_CHARS) {
        return result.substring(0, MAX_CHARS) + '\n\n[...TRUNCATED - document too large, showing first portion...]';
    }

    return result;
}

// Try each model in order — if one fails, move to the next
async function runGroqCompletion(
    messages: any[],
    models: string[]
): Promise<string> {
    let lastError: any = null;

    for (const modelId of models) {
        try {
            console.log(`Attempting Groq model: ${modelId}`);
            const completion = await groqClient.chat.completions.create({
                messages,
                model: modelId,
                temperature: 0.1,
                max_tokens: 2048,
                top_p: 1,
                stream: false,
                response_format: { type: "json_object" }
            });

            const content = completion.choices[0]?.message?.content;
            if (content) return content;
        } catch (err: any) {
            console.warn(`Groq Model ${modelId} failed:`, err.message);
            lastError = err;
            continue; // Try next model
        }
    }

    throw lastError || new Error("All Groq models failed");
}

// Expected shape for the JSON the model should return
const BOQ_JSON_STRUCTURE = `
You MUST return a valid JSON array. Every construction item, material, or product found must appear as a separate object in the array.

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
  { ... next item ... }
]

CRITICAL RULES:
- Extract EVERY line item. Do NOT stop after the first item.
- If a document has 20 items, your array must have 20 objects.
- Return ONLY the raw JSON array. No markdown code fences. No explanation text.`;

export async function POST(req: NextRequest) {
    // Rate limit check
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, 'scraping');

    if (!rateLimitResult.success) {
        return NextResponse.json(
            { error: "Rate limit exceeded. Please wait before trying again." },
            {
                status: 429,
                headers: getRateLimitHeaders(rateLimitResult)
            }
        );
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const fileName = formData.get('fileName') as string;

        if (!isGroqConfigured) {
            console.warn('⚠️ No GROQ_API_KEY found, using mock data.');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return NextResponse.json({
                success: true,
                mode: 'mock',
                materials: mockAnalyze(fileName || 'image.jpg')
            });
        }

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const mimeType = file.type || 'application/octet-stream';
        const safeName = fileName || file.name || 'unknown';

        // Log for debugging file type detection issues
        console.log(`📋 File received: name="${safeName}", mime="${mimeType}", size=${arrayBuffer.byteLength} bytes`);

        try {
            let rawContent: string;

            // ─── DOCUMENT PATH: Excel / CSV ───
            if (isDocumentFile(mimeType, safeName, arrayBuffer)) {
                console.log(`📄 Document detected (${mimeType}): parsing with SheetJS...`);

                const documentText = parseSpreadsheetToText(arrayBuffer, safeName);

                if (!documentText.trim()) {
                    return NextResponse.json(
                        { error: 'The uploaded document appears to be empty.' },
                        { status: 400 }
                    );
                }

                console.log(`Extracted ${documentText.length} chars from document. Sending to text model...`);

                const textPrompt = `
You are an expert South African Quantity Surveyor.
The user has uploaded a Bill of Quantities (BoQ) document. Below is the extracted text/data from the spreadsheet.

Analyze this data and extract ALL construction materials, products, and items listed.
For each item, identify the name, brand (if mentioned), category, quantity, and unit.
If quantities or units are unclear, use reasonable defaults.

--- DOCUMENT CONTENT ---
${documentText}
--- END DOCUMENT ---

${BOQ_JSON_STRUCTURE}`;

                rawContent = await runGroqCompletion(
                    [{ role: "user", content: textPrompt }],
                    TEXT_MODELS
                );

                // ─── PDF PATH: Use vision (may contain scans/handwriting) ───
            } else if (isPdfFile(mimeType, safeName)) {
                console.log(`📑 PDF detected: sending to vision model...`);

                const base64Image = Buffer.from(arrayBuffer).toString('base64');
                const dataUrl = `data:${mimeType};base64,${base64Image}`;

                const visionPrompt = `
You are an expert South African Quantity Surveyor.
Analyze this PDF document image. It may be a Bill of Quantities (BoQ), material list, or quotation.
Extract ALL construction materials and items visible.

${BOQ_JSON_STRUCTURE}`;

                rawContent = await runGroqCompletion(
                    [{
                        role: "user",
                        content: [
                            { type: "text", text: visionPrompt },
                            { type: "image_url", image_url: { url: dataUrl } },
                        ],
                    }],
                    VISION_MODELS
                );

                // ─── IMAGE PATH: Photos of materials ───
            } else {
                console.log(`📸 Image detected (${mimeType}): sending to vision model...`);

                const base64Image = Buffer.from(arrayBuffer).toString('base64');
                const dataUrl = `data:${mimeType};base64,${base64Image}`;

                const visionPrompt = `
You are an expert Quantity Surveyor.
Analyze this image of construction material.
Identify the MAIN item visible. Do not list background items.

${BOQ_JSON_STRUCTURE}`;

                rawContent = await runGroqCompletion(
                    [{
                        role: "user",
                        content: [
                            { type: "text", text: visionPrompt },
                            { type: "image_url", image_url: { url: dataUrl } },
                        ],
                    }],
                    VISION_MODELS
                );
            }

            console.log("Groq Raw Response:", rawContent);

            // Strip markdown fences if the model wrapped its output
            const cleanJson = rawContent
                .replace(/```json/gi, '')
                .replace(/```/g, '')
                .trim();

            let materials: Material[] = [];

            // Normalize response shape — models can return many different shapes
            let parsed = JSON.parse(cleanJson);

            if (Array.isArray(parsed)) {
                // ✅ Ideal case: model returned a direct array
            } else if (parsed && typeof parsed === 'object') {
                // Check common wrapper properties first
                if (Array.isArray(parsed.materials)) {
                    parsed = parsed.materials;
                } else if (Array.isArray(parsed.items)) {
                    parsed = parsed.items;
                } else if (Array.isArray(parsed.results)) {
                    parsed = parsed.results;
                } else if (Array.isArray(parsed.data)) {
                    parsed = parsed.data;
                } else {
                    // Last resort: if the object has numeric keys (e.g. {"0":{...}, "1":{...}})
                    // this happens when a model returns an object instead of an array
                    const values = Object.values(parsed);
                    const allObjects = values.every(v => typeof v === 'object' && v !== null && !Array.isArray(v));
                    if (allObjects && values.length > 0) {
                        parsed = values;
                    } else {
                        // Single item object — wrap it in an array
                        parsed = [parsed];
                    }
                }
            }

            if (!Array.isArray(parsed)) {
                throw new Error("AI returned an unrecognised JSON structure. Please try again.");
            }

            materials = parsed.map((m: any, i: number) => ({
                id: `ai-groq-${Date.now()}-${i}`,
                name: m.name || 'Unknown Item',
                brand: m.brand || 'Generic',
                category: m.category || 'other',
                quantity: Number(m.quantity) || 1,
                unit: m.unit || 'unit'
            }));

            return NextResponse.json({
                success: true,
                mode: 'live-groq',
                materials
            });

        } catch (aiError: any) {
            console.error('⚠️ Groq API Error:', aiError);

            // Send the error back to the frontend
            return NextResponse.json(
                { error: `AI Analysis Failed: ${aiError.message || 'Unknown error'}` },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Critical Error in analyze route:', error);
        return NextResponse.json({ error: 'Server processing error' }, { status: 500 });
    }
}
