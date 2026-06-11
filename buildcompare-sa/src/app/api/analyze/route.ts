import { NextRequest, NextResponse } from 'next/server';

import { checkRateLimit, getRateLimitHeaders, getClientIP } from '@/lib/rate-limit';
import { getDeepseekClient, checkDeepseekConfigured } from '@/lib/deepseek';
import { groqClient, isGroqConfigured } from '@/lib/groq';
import {
    BOQ_EXTRACT_PROMPT,
    extractPdfText,
    extractSpreadsheetText,
    isPdfFile,
    isSpreadsheetFile,
    materialsFromParsedRows,
    normaliseParsed,
    tryDirectBoQParse,
} from '@/lib/boq-engine';

// Groq fallback model — production-stable per team_standards.md.
const GROQ_FALLBACK_MODEL = 'llama-3.3-70b-versatile';

// Largest realistic BoQ workbook. Anything bigger is a mis-upload (or abuse)
// and would stall the xlsx parser.
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// ─── Provider chain ───────────────────────────────────────────────────────────

/**
 * Canonical chain (team_standards.md): DeepSeek → Groq → throw.
 * Never invoke Groq in front of DeepSeek; never silently swallow a failure.
 */
async function runBoqCompletion(prompt: string): Promise<string> {
    const messages = [{ role: 'user' as const, content: prompt }];

    if (checkDeepseekConfigured()) {
        try {
            console.log('BoQ extraction via DeepSeek (canonical): deepseek-chat');
            const completion = await getDeepseekClient().chat.completions.create({
                messages,
                model: 'deepseek-chat',
                temperature: 0.1,
                response_format: { type: 'json_object' },
            });
            const content = completion.choices[0]?.message?.content;
            if (content) return content;
            console.warn('DeepSeek returned an empty response — falling back to Groq.');
        } catch (err: any) {
            console.warn('DeepSeek BoQ extraction failed, falling back to Groq:', err?.message);
        }
    } else {
        console.warn('DEEPSEEK_API_KEY not configured — attempting Groq fallback.');
    }

    if (isGroqConfigured) {
        console.log(`BoQ extraction via Groq (fallback): ${GROQ_FALLBACK_MODEL}`);
        const res = await groqClient.chat.completions.create({
            messages,
            model: GROQ_FALLBACK_MODEL,
            temperature: 0.1,
            response_format: { type: 'json_object' },
        });
        const content = res.choices[0]?.message?.content;
        if (content) return content;
        throw new Error('Groq fallback returned an empty response.');
    }

    throw new Error(
        'No AI provider available — set DEEPSEEK_API_KEY (canonical) or GROQ_API_KEY (fallback).',
    );
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, 'default');

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

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const mimeType = file.type || 'application/octet-stream';
        const safeName = fileName || file.name || 'unknown';

        if (arrayBuffer.byteLength > MAX_UPLOAD_BYTES) {
            return NextResponse.json(
                { error: 'File is too large. BoQ uploads are capped at 15 MB — please split the workbook.' },
                { status: 413 }
            );
        }

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
Extract ALL construction materials from the spreadsheet below into JSON.

--- DOCUMENT ---
${docText}
--- END ---

${BOQ_EXTRACT_PROMPT}`;
                rawContent = await runBoqCompletion(prompt);

            // ── PDF ──────────────────────────────────────────────────────────
            } else if (isPdfFile(mimeType, safeName)) {
                const pdfText = extractPdfText(arrayBuffer);
                console.log(`📑 PDF: extracted ${pdfText.length} chars`);

                if (pdfText.length > 50) {
                    const prompt = `You are an expert South African Quantity Surveyor.
Extract ALL construction materials from this Bill of Quantities PDF into JSON.

--- PDF CONTENT ---
${pdfText}
--- END ---

${BOQ_EXTRACT_PROMPT}`;
                    rawContent = await runBoqCompletion(prompt);
                } else {
                    // PDF content streams are compressed — our extractor can't read them.
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
                console.log(`📸 Image detected (${mimeType}).`);
                return NextResponse.json(
                    { error: 'Image uploads are not supported for BoQ extraction. Please provide an Excel (.xlsx), CSV, or text-based PDF file.' },
                    { status: 400 }
                );
            }

            // Strip markdown fences if present
            const cleanJson = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = normaliseParsed(JSON.parse(cleanJson));

            if (!Array.isArray(parsed) || parsed.length === 0) {
                throw new Error('AI returned an empty or unrecognised response. Please try again.');
            }

            // Tender-grade integrity contract: drop ref-mirroring/junk rows,
            // never emit "other", labour resolves through BCCEI.
            const { materials, dropped } = materialsFromParsedRows(parsed);
            if (dropped.length > 0) {
                console.warn(
                    `BoQ integrity filter dropped ${dropped.length}/${parsed.length} rows:`,
                    dropped.map((d) => d.reason)
                );
            }
            if (materials.length === 0) {
                throw new Error('No valid BoQ line items survived integrity validation. Please check the document format.');
            }

            return NextResponse.json({
                success: true,
                mode: 'live-deepseek',
                materials,
                droppedRows: dropped.length,
            });

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
