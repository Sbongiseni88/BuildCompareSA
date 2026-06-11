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

export const maxDuration = 120; // Allow 2 min for large BOQs

export async function POST(req: NextRequest) {
    const formData = await req.formData();

    // Pass API Key natively so Python can handle parallel execution
    if (!formData.has('deepseek_key')) {
        const key = process.env.deepseek_api || process.env.DEEPSEEK_API_KEY || '';
        if (key) {
            formData.append('deepseek_key', key);
        }
    }

    // boq_parser.py only ships with the scraper microservice — the remote ECS
    // image does not include it yet, so SCRAPER_URL is deliberately NOT used
    // here. Point BOQ_PARSER_URL at a deployed parser when one exists.
    const scraperUrl =
        process.env.BOQ_PARSER_URL ||
        process.env.LOCAL_SCRAPER_URL ||
        'http://127.0.0.1:8001';
    
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
