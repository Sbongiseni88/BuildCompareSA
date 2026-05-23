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
import { getDeepseekClient, checkDeepseekConfigured } from '@/lib/deepseek';
import { generateSearchString, normalizeMaterialName } from '@/lib/boq-engine';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BatchPriceResult {
    material: Material;
    quotes: BatchQuote[];
    bestPrice: BatchQuote | null;
    averagePrice: number;
    potentialSavings: number;
    source: 'market-knowledge' | 'ai-batch-estimate';
    laborEstimate: number;
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

    return {
        material,
        quotes,
        bestPrice: best,
        averagePrice: Math.round(avg * 100) / 100,
        potentialSavings: Math.round((avg - best.price) * material.quantity * 100) / 100,
        source: 'market-knowledge',
        laborEstimate: quotes[0]?.laborEstimate || 0,
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

    try {
        if (!checkDeepseekConfigured()) {
            console.warn('DeepSeek not configured — returning empty estimates');
            return results;
        }

        const client = getDeepseekClient();
        const res = await client.chat.completions.create({
            messages: [{ role: 'system', content: prompt }],
            model: 'deepseek-chat',
            temperature: 0.1,
            response_format: { type: 'json_object' },
        });

        const rawContent = res.choices[0]?.message?.content;
        if (!rawContent) return results;

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

            results.set(material.id, {
                material,
                quotes,
                bestPrice: best,
                averagePrice: Math.round(avg * 100) / 100,
                potentialSavings: Math.round((avg - best.price) * material.quantity * 100) / 100,
                source: 'ai-batch-estimate',
                laborEstimate: typeof est.laborEstimate === 'number' ? est.laborEstimate : 0,
            });
        }
    } catch (err) {
        console.error('Batch AI estimate failed:', err);
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
    const unknowns: Material[] = [];

    // Phase 1: Try market knowledge for each material (instant)
    for (const material of materials) {
        const searchTerm = material.search_string || material.name;
        const knowledge = findProductKnowledge(searchTerm) || findProductKnowledge(material.name);

        if (knowledge) {
            knowledgeResults.push(resolveFromKnowledge(material, knowledge, userLat, userLng));
        } else {
            unknowns.push(material);
        }
    }

    // Phase 2: Batch AI estimate for unknowns (max 1 API call)
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

        // Neither matched — create a minimal result with no prices
        failed++;
        allResults.push({
            material,
            quotes: [],
            bestPrice: null,
            averagePrice: 0,
            potentialSavings: 0,
            source: 'ai-batch-estimate',
            laborEstimate: 0,
        });
    }

    return {
        results: allResults,
        stats: {
            total: materials.length,
            knowledgeMatched: knowledgeResults.length,
            aiEstimated: aiResults.size,
            failed,
        },
    };
}
