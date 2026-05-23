/**
 * BoQ Batch Price Endpoint
 *
 * Accepts an array of materials (from BoQ upload) and returns
 * price comparisons for all of them in a single response.
 *
 * Uses batch-price-resolver.ts which resolves prices via:
 * 1. Market knowledge (instant, no API call) for known categories
 * 2. A single batched AI call for unknown materials
 */

import { NextRequest, NextResponse } from 'next/server';
import { Material } from '@/types';
import { checkRateLimit, getRateLimitHeaders, getClientIP } from '@/lib/rate-limit';
import { resolveBatchPrices, type BatchResolveResult } from '@/lib/batch-price-resolver';

export const maxDuration = 60;

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
        const body = await req.json();
        const materials: Material[] = body.materials;
        const lat: number | undefined = body.lat;
        const lng: number | undefined = body.lng;

        if (!Array.isArray(materials) || materials.length === 0) {
            return NextResponse.json(
                { error: 'No materials provided. Expected { materials: Material[] }.' },
                { status: 400 }
            );
        }

        // Cap at 100 materials per request to prevent abuse
        const cappedMaterials = materials.slice(0, 100);

        console.log(`\n📦 BOQ BATCH PRICE: ${cappedMaterials.length} materials`);

        const result: BatchResolveResult = await resolveBatchPrices(
            cappedMaterials,
            lat,
            lng
        );

        console.log(
            `✅ Batch complete: ${result.stats.knowledgeMatched} knowledge, ` +
            `${result.stats.aiEstimated} AI, ${result.stats.failed} failed`
        );

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (error: any) {
        console.error('Batch pricing error:', error);
        return NextResponse.json(
            { error: `Batch pricing failed: ${error.message || 'Unknown error'}` },
            { status: 500 }
        );
    }
}
