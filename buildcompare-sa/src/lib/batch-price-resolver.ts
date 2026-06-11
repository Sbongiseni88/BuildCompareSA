/**
 * Batch Price Resolver
 *
 * Resolves prices for a batch of materials efficiently:
 * 1. Matches materials against sa-market-knowledge (instant, no API call)
 * 2. Batches unknown materials into a single AI call
 *
 * This replaces the old pattern of firing N parallel API calls
 * (one per material), which caused rate-limiting for large BoQs.
 */

import { Material } from '@/types';
import {
    findProductKnowledge,
    SA_STORES,
    type ProductKnowledge,
    type StoreProfile,
} from '@/data/sa-market-knowledge';
import { groqClient, isGroqConfigured } from '@/lib/groq';
import { getDeepseekClient, checkDeepseekConfigured } from '@/lib/deepseek';
import {
    generateSearchString,
    normalizeMaterialName,
    shouldBypassRetailPricing,
} from '@/lib/boq-engine';
import {
    RETAIL_STORES,
    RETAIL_STORE_LABELS,
    blankMatrix,
    assertSymmetric,
    cheapestQuote,
    logMatrixNa,
    type RetailMatrix,
    type RetailStore,
} from '@/lib/retail-matrix';
import { priceCacheKey, readCachedMatrices, type CachedMatrix } from '@/lib/price-cache';
import { estimatePgService, type PgServiceEstimate } from '@/lib/pg-services';
import { mapLegacyToTenderCategory, guessTenderCategory } from '@/lib/tender-categories';
import { estimateLabour } from '@/lib/bccei/labour';
import { isBoqCategory, type BoqCategory } from '@/lib/bccei/labour-defaults';

/**
 * Resolve a material's tender category.
 *
 * Order of trust: an explicit `tenderCategory` set by the BoQ pipeline wins;
 * then classification from the DESCRIPTION (e.g. "20A single pole circuit
 * breaker" → Electrical); the legacy `category` field is only a last resort.
 * The old code mapped solely from the legacy field, so a BoQ where every item
 * came through as 'other' collapsed to a single category for the whole sheet.
 */
function resolveTenderCategory(material: Material): BoqCategory {
    if (isBoqCategory(material.tenderCategory)) return material.tenderCategory;
    const fromDescription = guessTenderCategory(material.name || '');
    if (fromDescription.confidence !== 'low') return fromDescription.category;
    return mapLegacyToTenderCategory(material.category || 'other');
}
import fs from 'fs';
import path from 'path';

// ── Cache Settings ───────────────────────────────────────────────────────────

interface CachedBatchResult {
    quotes: BatchQuote[];
    laborEstimate: number;
    timestamp: number;
}

const AI_RESOLVED_CACHE = new Map<string, CachedBatchResult>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const cacheDir = path.join(process.cwd(), '.next', 'cache');
const cacheFilePath = path.join(cacheDir, 'ai-prices-cache.json');

function loadCacheFromFile() {
    try {
        if (fs.existsSync(cacheFilePath)) {
            const data = fs.readFileSync(cacheFilePath, 'utf8');
            const parsed = JSON.parse(data);
            if (typeof parsed === 'object' && parsed !== null) {
                const now = Date.now();
                for (const [key, val] of Object.entries(parsed)) {
                    const cachedVal = val as CachedBatchResult;
                    if (now - cachedVal.timestamp < CACHE_TTL_MS) {
                        AI_RESOLVED_CACHE.set(key, cachedVal);
                    }
                }
                console.log(`💾 Loaded ${AI_RESOLVED_CACHE.size} cached AI estimates from file.`);
            }
        }
    } catch (err: any) {
        console.warn('Failed to load AI prices cache from file:', err.message);
    }
}

function saveCacheToFile() {
    try {
        fs.mkdirSync(cacheDir, { recursive: true });
        const obj: Record<string, CachedBatchResult> = {};
        const now = Date.now();
        for (const [key, val] of AI_RESOLVED_CACHE.entries()) {
            if (now - val.timestamp < CACHE_TTL_MS) {
                obj[key] = val;
            }
        }
        fs.writeFileSync(cacheFilePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err: any) {
        console.warn('Failed to save AI prices cache to file:', err.message);
    }
}

// Load cache initially
loadCacheFromFile();

// ── Types ────────────────────────────────────────────────────────────────────

export interface BatchPriceResult {
    material: Material;
    quotes: BatchQuote[];
    bestPrice: BatchQuote | null;
    averagePrice: number;
    potentialSavings: number;
    source: 'cached-scrape' | 'market-knowledge' | 'ai-batch-estimate' | 'no-retail-pricing';
    laborEstimate: number;
    /**
     * Canonical 5-supplier matrix — same data as `quotes` but keyed by
     * store with N/A placeholders for any failed slot. Downstream
     * tender-grade exports (Excel) read from this field, not from `quotes`.
     */
    matrix: RetailMatrix;
    /** BCCEI tender category resolved for this material. */
    tenderCategory: BoqCategory;
    /**
     * Virtualized B2B site-operational service estimate for Preliminaries
     * lines (site offices, toilets, scaffolding, H&S allowances…). Clearly
     * labelled an indicative service rate — NEVER a retail price and never
     * part of the 5-store matrix.
     */
    pgService?: PgServiceEstimate | null;
    /** BCCEI-traceable labour estimate (ZAR, total for this material's qty). */
    bccei: {
        totalZar: number;
        rateZarPerHour: number;
        grade: number;
        hoursPerUnit: number;
        totalHours: number;
        year: 'Y1' | 'Y2' | 'Y3';
        basis: string;
    };
}

export interface BatchQuote {
    store: string;
    storeName: string;
    storeType: 'chain' | 'independent';
    price: number;
    priceConfidence: 'high' | 'medium' | 'low';
    inStock: boolean;
    url: string;
    distance: number;
    deliveryCost: number;
    laborEstimate: number;
}

export interface BatchResolveResult {
    results: BatchPriceResult[];
    stats: {
        total: number;
        knowledgeMatched: number;
        aiEstimated: number;
        failed: number;
        /** Preliminaries / structural lines deliberately not retail-priced. */
        nonRetail: number;
        /** Lines served real prices from the warm price_cache (pipeline-scraped). */
        cached: number;
    };
}

// ── Tender helpers (matrix + BCCEI labour) ───────────────────────────────────

function buildMatrixFromQuotes(
    quotes: BatchQuote[],
    source: 'market-knowledge' | 'ai-batch-estimate' | 'live-scrape',
    query: string,
): RetailMatrix {
    const matrix = blankMatrix('not_found');
    for (const q of quotes) {
        if (q.store in matrix && q.price > 0) {
            matrix[q.store as RetailStore] = {
                store: q.store as RetailStore,
                storeName: RETAIL_STORE_LABELS[q.store as RetailStore] ?? q.storeName,
                priceZar: q.price,
                status: 'ok',
                source,
            };
        }
    }
    // Anti-bias telemetry: log any column we couldn't populate.
    for (const store of RETAIL_STORES) {
        if (matrix[store].status === 'N/A') logMatrixNa(store, 'not_found', query);
    }
    assertSymmetric(matrix);
    return matrix;
}

/**
 * Result for a line that must NOT carry retail prices (Preliminaries / P&G
 * allowances / structural summaries). Per the retail_matrix_normalization
 * skill, every store column is an honest `N/A` — fabricating a 5-store
 * spread here was the "Cashbuild always wins" bias bug. BCCEI labour still
 * resolves so the tender line remains costable.
 */
function buildNoRetailResult(material: Material): BatchPriceResult {
    const tenderCategory = resolveTenderCategory(material);
    // Preliminaries lines get costed against the B2B site-services rate book
    // (site offices, chemical toilets, scaffolding, H&S allowances…) instead
    // of fabricated retail columns. The 5-store matrix stays all-N/A.
    const pgService =
        tenderCategory === 'Preliminaries'
            ? estimatePgService(material.name, material.quantity)
            : null;
    return {
        material,
        quotes: [],
        bestPrice: null,
        averagePrice: 0,
        potentialSavings: 0,
        source: 'no-retail-pricing',
        laborEstimate: 0,
        matrix: blankMatrix('not_attempted'),
        tenderCategory,
        bccei: bcceiForMaterial(material),
        pgService,
    };
}

/**
 * Build a result from REAL warm-cache prices (pipeline-scraped, independent
 * per store). Because these are genuine per-store quotes, crowning a cheapest
 * supplier here is honest — unlike the market-knowledge estimate path, which
 * fabricates a deterministic spread.
 */
function resultFromCachedMatrix(material: Material, cached: CachedMatrix): BatchPriceResult {
    const searchTerm = material.search_string || generateSearchString(material.name);
    const quotes: BatchQuote[] = [];

    for (const store of RETAIL_STORES) {
        const q = cached.matrix[store];
        if (q.status !== 'ok' || q.priceZar == null || q.priceZar <= 0) continue;
        const sp = SA_STORES.find(s => s.id === store);
        quotes.push({
            store,
            storeName: q.storeName,
            storeType: sp?.type || 'chain',
            price: q.priceZar,
            priceConfidence: 'high',
            inStock: true,
            url: sp
                ? sp.searchUrl.replace('{query}', encodeURIComponent(searchTerm))
                : `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`,
            distance: Math.round(Math.random() * 12 + 3),
            deliveryCost: sp?.deliveryCostRange[0] || 0,
            laborEstimate: 0,
        });
    }
    quotes.sort((a, b) => a.price - b.price);

    const best = quotes[0] ?? null;
    const avg = quotes.length ? quotes.reduce((sum, q) => sum + q.price, 0) / quotes.length : 0;

    return {
        material,
        quotes,
        bestPrice: best,
        averagePrice: Math.round(avg * 100) / 100,
        potentialSavings: best ? Math.round((avg - best.price) * material.quantity * 100) / 100 : 0,
        source: 'cached-scrape',
        laborEstimate: 0,
        matrix: cached.matrix,
        tenderCategory: resolveTenderCategory(material),
        bccei: bcceiForMaterial(material),
    };
}

function bcceiForMaterial(material: Material): BatchPriceResult['bccei'] {
    const category = resolveTenderCategory(material);
    const r = estimateLabour({ category, qty: material.quantity, unit: material.unit || 'unit' });
    return {
        totalZar: r.totalZar,
        rateZarPerHour: r.rateZarPerHour,
        grade: r.grade,
        hoursPerUnit: r.hoursPerUnit,
        totalHours: r.totalHours,
        year: r.year,
        basis: r.basis,
    };
}

// ── Market Knowledge Resolver (no API call) ──────────────────────────────────

function resolveFromKnowledge(
    material: Material,
    knowledge: ProductKnowledge,
    userLat?: number,
    userLng?: number
): BatchPriceResult {
    const [minBase, maxBase] = knowledge.priceRange;
    const midBase = (minBase + maxBase) / 2;

    // Try to detect brand/grade from the material name for better pricing
    const nameLC = material.name.toLowerCase();
    let brandMultiplier = 1.0;
    let gradMultiplier = 1.0;

    for (const brand of knowledge.brands) {
        if (nameLC.includes(brand.name.toLowerCase())) {
            brandMultiplier = 1 + (brand.tier * 0.1);
            break;
        }
    }
    for (const variant of knowledge.variants) {
        if (nameLC.includes(variant.name.toLowerCase())) {
            gradMultiplier = variant.priceMultiplier;
            break;
        }
    }

    const quotes: BatchQuote[] = SA_STORES.map((store: StoreProfile) => {
        const storeMultiplier = 1 + (store.pricePosition * 0.1);
        const rawPrice = midBase * brandMultiplier * gradMultiplier * storeMultiplier;
        const price = Math.round(Math.max(minBase * 0.9, Math.min(maxBase * 1.1, rawPrice)) * 100) / 100;

        const searchTerm = material.search_string || generateSearchString(material.name);
        return {
            store: store.id,
            storeName: store.name,
            storeType: store.type,
            price,
            priceConfidence: 'medium' as const,
            inStock: true,
            url: store.searchUrl.replace('{query}', encodeURIComponent(searchTerm)),
            distance: Math.round(Math.random() * 12 + 3), // Placeholder — real geo would be used if coords available
            deliveryCost: store.deliveryCostRange[0],
            laborEstimate: Math.round((knowledge.laborPerUnit[0] + knowledge.laborPerUnit[1]) / 2),
        };
    }).sort((a, b) => a.price - b.price);

    const best = quotes[0];
    const avg = quotes.reduce((sum, q) => sum + q.price, 0) / quotes.length;

    const matrix = buildMatrixFromQuotes(quotes, 'market-knowledge', material.name);
    const bccei = bcceiForMaterial(material);

    return {
        material,
        quotes,
        bestPrice: best,
        averagePrice: Math.round(avg * 100) / 100,
        potentialSavings: Math.round((avg - best.price) * material.quantity * 100) / 100,
        source: 'market-knowledge',
        laborEstimate: quotes[0]?.laborEstimate || 0,
        matrix,
        tenderCategory: resolveTenderCategory(material),
        bccei,
    };
}

// ── AI Batch Estimate (single API call for unknowns) ─────────────────────────

async function batchAIEstimate(materials: Material[]): Promise<Map<string, BatchPriceResult>> {
    const results = new Map<string, BatchPriceResult>();
    if (materials.length === 0) return results;

    // Build the batch prompt
    const itemList = materials.map((m, i) => `${i + 1}. "${m.search_string || m.name}" (qty: ${m.quantity} ${m.unit})`).join('\n');

    const prompt = `You are a South African building materials pricing expert.
Provide realistic 2024-2026 ZAR price estimates for each of the following items.
For EACH item, estimate the price at these 5 SA stores:
- Builders Warehouse
- Cashbuild
- Build it
- Leroy Merlin
- BUCO

Items to price:
${itemList}

Return JSON:
{
  "estimates": [
    {
      "itemIndex": 1,
      "product": "Standardized product name",
      "stores": [
        { "storeId": "builders", "store": "Builders Warehouse", "price": 99.95, "inStock": true },
        { "storeId": "cashbuild", "store": "Cashbuild", "price": 89.95, "inStock": true },
        { "storeId": "buildit", "store": "Build it", "price": 94.50, "inStock": true },
        { "storeId": "leroy_merlin", "store": "Leroy Merlin", "price": 102.00, "inStock": true },
        { "storeId": "buco", "store": "BUCO", "price": 95.00, "inStock": true }
      ],
      "laborEstimate": 25.00
    }
  ]
}

CRITICAL:
- Prices must be realistic ZAR floats based on actual SA market patterns.
- laborEstimate = estimated installation labor cost per unit in ZAR.
- Do NOT hallucinate extreme prices. Use your training knowledge of SA hardware retail.
- Return ONLY valid JSON. No markdown.`;

    let rawContent: string | null = null;
    let usedModel = '';

    // Step 1: Try DeepSeek first (Primary)
    if (checkDeepseekConfigured()) {
        try {
            console.log('Attempting batch AI estimate via DeepSeek (Primary)...');
            const client = getDeepseekClient();
            const res = await client.chat.completions.create({
                messages: [{ role: 'system', content: prompt }],
                model: 'deepseek-chat',
                temperature: 0.1,
                response_format: { type: 'json_object' },
            });
            rawContent = res.choices[0]?.message?.content || null;
            usedModel = 'deepseek';
        } catch (err: any) {
            console.warn('DeepSeek batch estimate failed, falling back to Groq:', err.message);
        }
    }

    // Step 2: Try Groq if DeepSeek failed or was not configured (Secondary/Fallback)
    if (!rawContent && isGroqConfigured) {
        try {
            console.log('Attempting batch AI estimate via Groq (Secondary)...');
            const res = await groqClient.chat.completions.create({
                messages: [{ role: 'system', content: prompt }],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.1,
                response_format: { type: 'json_object' },
            });
            rawContent = res.choices[0]?.message?.content || null;
            usedModel = 'groq';
        } catch (err: any) {
            console.error('Groq fallback batch estimate failed:', err.message);
        }
    }

    if (!rawContent) {
        console.warn('Both Groq and DeepSeek AI estimators failed or were unconfigured.');
        return results;
    }

    try {
        const parsed = JSON.parse(rawContent);
        const estimates = Array.isArray(parsed.estimates) ? parsed.estimates : [];

        for (const est of estimates) {
            const idx = (est.itemIndex || 1) - 1;
            if (idx < 0 || idx >= materials.length) continue;

            const material = materials[idx];
            const stores = Array.isArray(est.stores) ? est.stores : [];
            const searchTerm = material.search_string || generateSearchString(material.name);

            const quotes: BatchQuote[] = stores
                .filter((s: any) => typeof s.price === 'number' && s.price > 0)
                .map((s: any): BatchQuote => {
                    const storeProfile = SA_STORES.find(sp => sp.id === s.storeId);
                    return {
                        store: s.storeId || 'unknown',
                        storeName: s.store || storeProfile?.name || 'Unknown Store',
                        storeType: storeProfile?.type || 'chain',
                        price: s.price,
                        priceConfidence: 'low',
                        inStock: s.inStock ?? true,
                        url: storeProfile
                            ? storeProfile.searchUrl.replace('{query}', encodeURIComponent(searchTerm))
                            : `https://www.google.com/search?q=${encodeURIComponent(searchTerm + ' price South Africa')}`,
                        distance: Math.round(Math.random() * 12 + 3),
                        deliveryCost: storeProfile?.deliveryCostRange[0] || 150,
                        laborEstimate: typeof est.laborEstimate === 'number' ? est.laborEstimate : 0,
                    };
                })
                .sort((a: BatchQuote, b: BatchQuote) => a.price - b.price);

            if (quotes.length === 0) continue;

            const best = quotes[0];
            const avg = quotes.reduce((sum, q) => sum + q.price, 0) / quotes.length;

            const matrix = buildMatrixFromQuotes(quotes, 'ai-batch-estimate', material.name);
            const bccei = bcceiForMaterial(material);

            results.set(material.id, {
                material,
                quotes,
                bestPrice: best,
                averagePrice: Math.round(avg * 100) / 100,
                potentialSavings: Math.round((avg - best.price) * material.quantity * 100) / 100,
                source: 'ai-batch-estimate',
                laborEstimate: typeof est.laborEstimate === 'number' ? est.laborEstimate : 0,
                matrix,
                tenderCategory: resolveTenderCategory(material),
                bccei,
            });

            // Store in cache
            const cacheKey = normalizeMaterialName(material.name);
            AI_RESOLVED_CACHE.set(cacheKey, {
                quotes,
                laborEstimate: typeof est.laborEstimate === 'number' ? est.laborEstimate : 0,
                timestamp: Date.now(),
            });
        }

        if (estimates.length > 0) {
            saveCacheToFile();
        }
    } catch (err) {
        console.error(`Failed to parse AI batch results (source: ${usedModel}):`, err);
    }

    return results;
}

// ── Main Batch Resolver ─────────────────────────────────────────────────────

export async function resolveBatchPrices(
    materials: Material[],
    userLat?: number,
    userLng?: number
): Promise<BatchResolveResult> {
    const knowledgeResults: BatchPriceResult[] = [];
    const nonRetailResults = new Map<string, BatchPriceResult>();
    const cachedResults = new Map<string, BatchPriceResult>();
    const unknowns: Material[] = [];

    // Phase 0: Split non-retail (Preliminaries / structural) lines off — they
    // get an all-N/A matrix and are NEVER priced or sent to the estimator.
    const priceable: Material[] = [];
    for (const material of materials) {
        if (shouldBypassRetailPricing(material)) {
            nonRetailResults.set(material.id, buildNoRetailResult(material));
        } else {
            priceable.push(material);
        }
    }

    // Phase 1: Warm price_cache (real pipeline-scraped prices) — highest
    // priority. A hit yields genuine independent per-store quotes, so the
    // cheapest supplier is real (not a fabricated spread). Degrades to the
    // estimate path on any miss or read failure.
    try {
        const keyOf = (m: Material) => priceCacheKey(m.search_string || m.name);
        const cacheHits = await readCachedMatrices(priceable.map(keyOf));
        for (const material of priceable) {
            const hit = cacheHits.get(keyOf(material));
            if (hit) cachedResults.set(material.id, resultFromCachedMatrix(material, hit));
        }
        if (cachedResults.size > 0) {
            console.log(`💾 price_cache served ${cachedResults.size}/${priceable.length} lines with real prices.`);
        }
    } catch (err) {
        console.warn('price_cache lookup failed — falling back to knowledge/AI:', err);
    }

    // Phase 2: Market knowledge / in-memory AI cache for the cache-misses.
    for (const material of priceable) {
        if (cachedResults.has(material.id)) continue;

        const searchTerm = material.search_string || material.name;
        const knowledge = findProductKnowledge(searchTerm) || findProductKnowledge(material.name);

        if (knowledge) {
            knowledgeResults.push(resolveFromKnowledge(material, knowledge, userLat, userLng));
        } else {
            const cacheKey = normalizeMaterialName(material.name);
            const cached = AI_RESOLVED_CACHE.get(cacheKey);
            const now = Date.now();
            if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
                const quotes = cached.quotes;
                const best = quotes[0];
                const avg = quotes.reduce((sum, q) => sum + q.price, 0) / quotes.length;
                const matrix = buildMatrixFromQuotes(quotes, 'ai-batch-estimate', material.name);
                const bccei = bcceiForMaterial(material);
                knowledgeResults.push({
                    material,
                    quotes,
                    bestPrice: best,
                    averagePrice: Math.round(avg * 100) / 100,
                    potentialSavings: Math.round((avg - best.price) * material.quantity * 100) / 100,
                    source: 'ai-batch-estimate',
                    laborEstimate: cached.laborEstimate,
                    matrix,
                    tenderCategory: resolveTenderCategory(material),
                    bccei,
                });
            } else {
                unknowns.push(material);
            }
        }
    }

    // Phase 3: Batch AI estimate for unknowns (max 1 API call)
    // Limit batch size to 30 items to stay within token limits
    const aiResults = new Map<string, BatchPriceResult>();
    if (unknowns.length > 0) {
        const batches: Material[][] = [];
        for (let i = 0; i < unknowns.length; i += 30) {
            batches.push(unknowns.slice(i, i + 30));
        }

        const batchPromises = batches.map(batch => batchAIEstimate(batch));
        const allBatchResults = await Promise.all(batchPromises);
        for (const batchResults of allBatchResults) {
            for (const [id, result] of batchResults) {
                aiResults.set(id, result);
            }
        }
    }

    // Merge results in original order
    const allResults: BatchPriceResult[] = [];
    let failed = 0;

    for (const material of materials) {
        const nonRetail = nonRetailResults.get(material.id);
        if (nonRetail) {
            allResults.push(nonRetail);
            continue;
        }

        const cachedResult = cachedResults.get(material.id);
        if (cachedResult) {
            allResults.push(cachedResult);
            continue;
        }

        const knResult = knowledgeResults.find(r => r.material.id === material.id);
        if (knResult) {
            allResults.push(knResult);
            continue;
        }

        const aiResult = aiResults.get(material.id);
        if (aiResult) {
            allResults.push(aiResult);
            continue;
        }

        // Neither matched — every column is N/A but labour still resolves.
        failed++;
        const matrix = buildMatrixFromQuotes([], 'ai-batch-estimate', material.name);
        const bccei = bcceiForMaterial(material);
        allResults.push({
            material,
            quotes: [],
            bestPrice: null,
            averagePrice: 0,
            potentialSavings: 0,
            source: 'ai-batch-estimate',
            laborEstimate: 0,
            matrix,
            tenderCategory: resolveTenderCategory(material),
            bccei,
        });
    }

    const knowledgeMatchedCount = allResults.filter(r => r.source === 'market-knowledge').length;
    const aiEstimatedCount = allResults.filter(r => r.source === 'ai-batch-estimate' && r.quotes.length > 0).length;

    return {
        results: allResults,
        stats: {
            total: materials.length,
            knowledgeMatched: knowledgeMatchedCount,
            aiEstimated: aiEstimatedCount,
            failed,
            nonRetail: nonRetailResults.size,
            cached: cachedResults.size,
        },
    };
}
