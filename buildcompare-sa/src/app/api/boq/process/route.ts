/**
 * Streaming BOQ Processor
 *
 * Accepts a file upload, processes it in stages, and streams
 * progress events back to the client as NDJSON.
 *
 * Stages:
 *   1. upload        — File received
 *   2. extract       — Data extraction from PDF/Excel
 *   3. analyze       — AI analysis of document content
 *   4. deduplicate   — Normalize + merge duplicate items
 *   5. pricing       — Batch price lookups (parallel)
 *   6. labour        — Labour cost estimation
 *   7. complete      — Final results
 */

import { NextRequest } from 'next/server';
import { Material } from '@/types';
import { deepseekClient, isDeepseekConfigured } from '@/lib/deepseek';
import { groqClient, isGroqConfigured } from '@/lib/groq';
import {
    isSpreadsheetFile,
    isPdfFile,
    extractPdfText,
    extractSpreadsheetText,
    tryDirectBoQParse,
    guessCategory,
    deduplicateMaterials,
    normalizeMaterialName,
    getCachedPrice,
    setCachedPrice,
    estimateRemainingTime,
    BOQ_EXTRACT_PROMPT,
    normaliseParsed,
    type CachedPrice,
} from '@/lib/boq-engine';
import {
    findProductKnowledge,
    SA_STORES,
} from '@/data/sa-market-knowledge';

export const maxDuration = 120; // Allow 2 min for large BOQs

// ── Progress Event Types ─────────────────────────────────────────────────
interface ProgressEvent {
    stage: string;
    progress: number; // 0-100
    message: string;
    totalItems?: number;
    processedItems?: number;
    estimatedTimeRemaining?: number; // seconds
    partialResults?: any[];
    error?: string;
    materials?: Material[];
}

// ── AI Call Helper ───────────────────────────────────────────────────────
async function callAI(prompt: string): Promise<string> {
    if (isDeepseekConfigured) {
        try {
            const res = await deepseekClient.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'deepseek-chat',
                temperature: 0.1,
                response_format: { type: 'json_object' },
            });
            return res.choices[0]?.message?.content || '[]';
        } catch (err: any) {
            console.warn('DeepSeek failed:', err.message);
        }
    }
    if (isGroqConfigured) {
        const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
        for (const model of models) {
            try {
                const res = await groqClient.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model,
                    temperature: 0.1,
                    response_format: { type: 'json_object' },
                });
                return res.choices[0]?.message?.content || '[]';
            } catch (err: any) {
                console.warn(`Groq ${model} failed:`, err.message);
            }
        }
    }
    throw new Error('No AI provider configured');
}

// ── Price Lookup (uses market knowledge + cache) ──────────────────────────

interface PriceResult {
    materialName: string;
    cheapestPrice: number;
    cheapestStore: string;
    averagePrice: number;
    laborEstimate: number;
    confidence: 'high' | 'medium' | 'low';
    stores: { name: string; price: number }[];
}

function lookupPriceFromKnowledge(material: Material): PriceResult {
    const cacheKey = normalizeMaterialName(material.name);
    const cached = getCachedPrice(cacheKey);
    if (cached) {
        return {
            materialName: material.name,
            cheapestPrice: cached.price,
            cheapestStore: cached.store,
            averagePrice: cached.price * 1.05,
            laborEstimate: cached.laborEstimate,
            confidence: cached.confidence,
            stores: [{ name: cached.store, price: cached.price }],
        };
    }

    const knowledge = findProductKnowledge(material.name);
    if (!knowledge) {
        // Unknown product — return zero, will be estimated by AI later
        return {
            materialName: material.name,
            cheapestPrice: 0,
            cheapestStore: 'Unknown',
            averagePrice: 0,
            laborEstimate: 0,
            confidence: 'low',
            stores: [],
        };
    }

    const [minBase, maxBase] = knowledge.priceRange;
    const midBase = (minBase + maxBase) / 2;

    const storeResults: { name: string; price: number }[] = [];
    for (const store of SA_STORES) {
        const multiplier = 1 + (store.pricePosition * 0.1);
        const price = Math.round(midBase * multiplier * 100) / 100;
        storeResults.push({ name: store.name, price: Math.max(minBase * 0.9, Math.min(maxBase * 1.1, price)) });
    }
    storeResults.sort((a, b) => a.price - b.price);

    const laborMid = (knowledge.laborPerUnit[0] + knowledge.laborPerUnit[1]) / 2;

    const result: PriceResult = {
        materialName: material.name,
        cheapestPrice: storeResults[0].price,
        cheapestStore: storeResults[0].name,
        averagePrice: storeResults.reduce((a, s) => a + s.price, 0) / storeResults.length,
        laborEstimate: Math.round(laborMid),
        confidence: 'medium',
        stores: storeResults,
    };

    // Cache it
    setCachedPrice(cacheKey, {
        price: result.cheapestPrice,
        store: result.cheapestStore,
        laborEstimate: result.laborEstimate,
        confidence: result.confidence,
        timestamp: Date.now(),
    });

    return result;
}

// ── MAIN ROUTE ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: ProgressEvent) => {
                try {
                    controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
                } catch { /* stream may be closed */ }
            };

            const startTime = Date.now();
            let materials: Material[] = [];

            try {
                // ─── STAGE 1: Upload ──────────────────────────────────────
                send({
                    stage: 'upload',
                    progress: 5,
                    message: 'Document received. Starting analysis...',
                });

                const formData = await req.formData();
                const file = formData.get('file') as File;
                const fileName = (formData.get('fileName') as string) || file?.name || 'unknown';

                if (!file) {
                    send({ stage: 'error', progress: 0, message: 'No file uploaded.', error: 'No file uploaded' });
                    controller.close();
                    return;
                }

                const arrayBuffer = await file.arrayBuffer();
                const mimeType = file.type || 'application/octet-stream';

                send({
                    stage: 'upload',
                    progress: 10,
                    message: `Uploaded "${fileName}" (${(arrayBuffer.byteLength / 1024).toFixed(0)}KB)`,
                });

                console.log(`📋 BOQ Process: "${fileName}" | ${mimeType} | ${arrayBuffer.byteLength} bytes`);

                // ─── STAGE 2: Extract data from file ──────────────────────
                send({
                    stage: 'extract',
                    progress: 15,
                    message: 'Extracting data from document...',
                });

                let documentText = '';
                let directParsed: Material[] | null = null;

                if (isSpreadsheetFile(mimeType, fileName, arrayBuffer)) {
                    // Try direct structured parse first (no AI needed)
                    directParsed = tryDirectBoQParse(arrayBuffer);
                    if (directParsed && directParsed.length > 0) {
                        send({
                            stage: 'extract',
                            progress: 30,
                            message: `Direct parsing found ${directParsed.length} items.`,
                            totalItems: directParsed.length,
                        });
                        materials = directParsed;
                    } else {
                        documentText = extractSpreadsheetText(arrayBuffer);
                    }
                } else if (isPdfFile(mimeType, fileName)) {
                    documentText = extractPdfText(arrayBuffer);
                    if (documentText.length < 50) {
                        send({
                            stage: 'error',
                            progress: 0,
                            message: 'Could not read text from this PDF (may be image-based). Please export as Excel (.xlsx) and re-upload.',
                            error: 'PDF_UNREADABLE',
                        });
                        controller.close();
                        return;
                    }
                } else {
                    // Image — not handled in streaming endpoint, fall back to regular analyze
                    send({
                        stage: 'error',
                        progress: 0,
                        message: 'Image files should be uploaded via the regular upload. This endpoint works best with PDF and Excel.',
                        error: 'IMAGE_NOT_SUPPORTED',
                    });
                    controller.close();
                    return;
                }

                send({
                    stage: 'extract',
                    progress: 25,
                    message: documentText
                        ? `Extracted ${documentText.length} characters of text.`
                        : `Parsed ${materials.length} items from spreadsheet.`,
                });

                // ─── STAGE 3: AI Analysis (if no direct parse) ────────────
                if (materials.length === 0 && documentText) {
                    send({
                        stage: 'analyze',
                        progress: 30,
                        message: 'AI is analyzing your document...',
                        estimatedTimeRemaining: Math.round(documentText.length / 500),
                    });

                    const fileType = isPdfFile(mimeType, fileName) ? 'PDF' : 'spreadsheet';
                    const prompt = `You are an expert South African Quantity Surveyor.
Extract ALL construction materials from this ${fileType} document.

--- DOCUMENT ---
${documentText}
--- END ---

${BOQ_EXTRACT_PROMPT}`;

                    try {
                        const rawResponse = await callAI(prompt);
                        const cleanJson = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
                        const parsed = normaliseParsed(JSON.parse(cleanJson));

                        materials = parsed.map((m: any, i: number) => ({
                            id: `boq-ai-${Date.now()}-${i}`,
                            name: m.name || 'Unknown Item',
                            brand: m.brand || undefined,
                            category: m.category || guessCategory(m.name || ''),
                            quantity: Number(m.quantity) || 1,
                            unit: m.unit || 'unit',
                            laborCostEstimate: Number(m.laborCostEstimate) || undefined,
                        }));

                        send({
                            stage: 'analyze',
                            progress: 45,
                            message: `AI extracted ${materials.length} items from document.`,
                            totalItems: materials.length,
                        });
                    } catch (aiErr: any) {
                        send({
                            stage: 'error',
                            progress: 0,
                            message: `AI analysis failed: ${aiErr.message}. Please try again.`,
                            error: aiErr.message,
                        });
                        controller.close();
                        return;
                    }
                }

                if (materials.length === 0) {
                    send({
                        stage: 'error',
                        progress: 0,
                        message: 'No materials found in the document. Ensure it contains construction items.',
                        error: 'NO_MATERIALS',
                    });
                    controller.close();
                    return;
                }

                // ─── STAGE 4: Deduplication ───────────────────────────────
                send({
                    stage: 'deduplicate',
                    progress: 50,
                    message: `Deduplicating ${materials.length} items...`,
                    totalItems: materials.length,
                });

                const dedupResult = deduplicateMaterials(materials);
                materials = dedupResult.unique;

                send({
                    stage: 'deduplicate',
                    progress: 55,
                    message: dedupResult.duplicatesRemoved > 0
                        ? `Merged ${dedupResult.duplicatesRemoved} duplicates. ${materials.length} unique items.`
                        : `${materials.length} unique items found.`,
                    totalItems: materials.length,
                });

                // ─── STAGE 5: Pricing (parallel batches) ──────────────────
                const BATCH_SIZE = 8;
                const totalBatches = Math.ceil(materials.length / BATCH_SIZE);
                const pricingStart = Date.now();
                const priceResults: PriceResult[] = [];
                let processedCount = 0;
                let cacheHits = 0;

                send({
                    stage: 'pricing',
                    progress: 58,
                    message: `Searching prices for ${materials.length} items across ${SA_STORES.length} stores...`,
                    totalItems: materials.length,
                    processedItems: 0,
                    estimatedTimeRemaining: Math.ceil(materials.length * 0.1),
                });

                for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
                    const batchStart = batchIdx * BATCH_SIZE;
                    const batch = materials.slice(batchStart, batchStart + BATCH_SIZE);

                    // Process entire batch in parallel
                    const batchResults = await Promise.all(
                        batch.map(async (material) => {
                            const cacheKey = normalizeMaterialName(material.name);
                            const cached = getCachedPrice(cacheKey);
                            if (cached) {
                                cacheHits++;
                                return {
                                    materialName: material.name,
                                    cheapestPrice: cached.price,
                                    cheapestStore: cached.store,
                                    averagePrice: cached.price * 1.05,
                                    laborEstimate: cached.laborEstimate,
                                    confidence: cached.confidence as 'high' | 'medium' | 'low',
                                    stores: [{ name: cached.store, price: cached.price }],
                                };
                            }
                            return lookupPriceFromKnowledge(material);
                        })
                    );

                    priceResults.push(...batchResults);
                    processedCount += batch.length;

                    const elapsed = Date.now() - pricingStart;
                    const eta = estimateRemainingTime(processedCount, materials.length, elapsed);
                    const pct = 58 + Math.round((processedCount / materials.length) * 25);

                    send({
                        stage: 'pricing',
                        progress: Math.min(pct, 83),
                        message: `Processed ${processedCount} of ${materials.length} items${cacheHits > 0 ? ` (${cacheHits} cached)` : ''}...`,
                        totalItems: materials.length,
                        processedItems: processedCount,
                        estimatedTimeRemaining: eta,
                        partialResults: batchResults.filter(r => r.cheapestPrice > 0).map(r => ({
                            name: r.materialName,
                            price: r.cheapestPrice,
                            store: r.cheapestStore,
                        })),
                    });
                }

                // ─── STAGE 6: Labour costs ────────────────────────────────
                send({
                    stage: 'labour',
                    progress: 85,
                    message: 'Calculating labour cost estimates...',
                    totalItems: materials.length,
                    processedItems: materials.length,
                });

                // Enrich materials with price + labour data
                for (let i = 0; i < materials.length; i++) {
                    const priceResult = priceResults[i];
                    if (priceResult) {
                        materials[i].laborCostEstimate =
                            materials[i].laborCostEstimate || priceResult.laborEstimate;
                    }
                }

                send({
                    stage: 'labour',
                    progress: 92,
                    message: `Labour costs estimated for ${materials.length} items.`,
                    totalItems: materials.length,
                    processedItems: materials.length,
                });

                // ─── STAGE 7: Complete ────────────────────────────────────
                const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`✅ BOQ processed: ${materials.length} items in ${totalTime}s (${cacheHits} cache hits)`);

                send({
                    stage: 'complete',
                    progress: 100,
                    message: `Done! ${materials.length} items processed in ${totalTime}s.`,
                    totalItems: materials.length,
                    processedItems: materials.length,
                    materials,
                });

            } catch (error: any) {
                console.error('BOQ Processing error:', error);
                send({
                    stage: 'error',
                    progress: 0,
                    message: `Processing failed: ${error.message || 'Unknown error'}. Please try again.`,
                    error: error.message,
                });
            } finally {
                try { controller.close(); } catch { /* already closed */ }
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Cache-Control': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}
