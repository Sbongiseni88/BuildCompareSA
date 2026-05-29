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
import { getDeepseekClient, checkDeepseekConfigured } from '@/lib/deepseek';
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
    if (checkDeepseekConfigured()) {
        try {
            const client = getDeepseekClient();
            const res = await client.chat.completions.create({
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

export async function POST(req: NextRequest) {
    const formData = await req.formData();

    // Pass API Key natively so Python can handle parallel execution
    if (!formData.has('deepseek_key')) {
        const key = process.env.deepseek_api || process.env.DEEPSEEK_API_KEY || '';
        if (key) {
            formData.append('deepseek_key', key);
        }
    }

    // We temporarily bypass SCRAPER_URL because the remote ECS does not have boq_parser.py yet!
    // It must hit the local uvicorn parser instance running on 8001.
    const scraperUrl = 'http://127.0.0.1:8001';
    
    try {
        console.log("⚡ Proxying BOQ extraction to high-speed Python scraper pipeline...");
        const res = await fetch(`${scraperUrl}/boq/extract`, {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Scraper Error ${res.status}: ${errBody}`);
        }

        return new Response(res.body, {
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Cache-Control': 'no-cache',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error: any) {
        console.error("BOQ Extraction Proxy Error:", error);
        return new Response(
            JSON.stringify({ 
                stage: "error", 
                progress: 0, 
                message: error.message 
            }), {
            status: 500,
            headers: { 'Content-Type': 'application/x-ndjson' }
        });
    }
}
