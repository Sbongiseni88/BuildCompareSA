import { NextResponse } from 'next/server';
import { deepseekClient, isDeepseekConfigured } from '@/lib/deepseek';

// Vercel serverless functions will timeout in 10-15s natively.
// We explicitly request up to 60s since Playwright headless scraping takes time.
export const maxDuration = 60;

// MVP In-Memory Cache. 
// Keys are sanitized: "builders_cement_gauteng". Stores the parsed JSON array of Date.now() TTL.
const PRICE_CACHE: Record<string, { timestamp: number; data: any }> = {};
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const store = searchParams.get('store');
    const query = searchParams.get('q');

    if (!store || !query) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!isDeepseekConfigured) {
        return NextResponse.json({ error: 'DeepSeek key missing' }, { status: 500 });
    }

    // ── CACHE LAYER ──
    // Normalize string: cement-50kg -> cement50kg
    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cacheKey = `${store}_${cleanQuery}`;
    
    // Check Cache
    const cachedEntry = PRICE_CACHE[cacheKey];
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
        console.log(`⏱️ Cache HIT for ${cacheKey}`);
        return NextResponse.json({ success: true, cached: true, results: cachedEntry.data });
    }

    try {
        console.log(`🌐 Scraping ${store} for "${query}" via Python microservice...`);
        
        // Timeout to abort hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); 

        // ── SCRAPE LAYER ──
        // Fully localized connection, sever AWS proxy
        const scraperUrl = process.env.LOCAL_SCRAPER_URL || 'http://127.0.0.1:8001';
        const pyRes = await fetch(
            `${scraperUrl}/scrape?store=${encodeURIComponent(store)}&query=${encodeURIComponent(query)}`,
            { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (!pyRes.ok) {
            const errBody = await pyRes.text();
            console.error('Python Scraper failed:', errBody);
            // Handle timeout/block elegantly
            return NextResponse.json({ success: false, results: [], error: 'Scraper failed' }, { status: 502 });
        }

        const data = await pyRes.json();
        const rawText = data.raw_text;

        if (!rawText || rawText.length < 20) {
            // Guardrail: Empty/No Results Found handling
            return NextResponse.json({ success: true, results: [] });
        }

        // ── DEEPSEEK LAYER ──
        const systemPrompt = `You are an expert South African pricing data extractor.
The user queried a hardware store ("${store}") for the item: "${query}".
Below is the raw unstructured text extracted from the webpage.

Extract all relevant product prices from this text.
Return ONLY a valid JSON array of objects structured exactly like this:
[
  {
    "id": "generated-id-1",
    "supplierId": "${store}",
    "price": 105.50,         // Must be a standard float number! Strip currency symbols and commas.
    "url": "#",              // Put "#" since we just have text
    "inStock": true,
    "deliveryDays": 2,
    "nameDetails": "Actual Product Name from Text",
    "laborCostEstimate": 150.0 // Estimate the installation labor cost for this item in ZAR based on SA rates
  }
]

CRITICAL RULES:
1. "laborCostEstimate": Provide a realistic labor cost for installing this specific material.
2. Prices and labor must be floats (123.45). Never strings.
3. Do NOT hallucinate products. If the raw text does not contain any matching products and prices, return an EMPTY ARRAY: [].
4. Ignore header noise like "My Cart", "Sign in", "Terms".

--- RAW WEB TEXT ---
${rawText}
--- END TEXT ---`;

        console.log(`🤖 Passing ${rawText.length} chars to DeepSeek for structural parsing...`);
        
        const chatCompletion = await deepseekClient.chat.completions.create({
            messages: [{ role: 'system', content: systemPrompt }],
            model: 'deepseek-chat',
            temperature: 0.1,
            response_format: { type: 'json_object' },
        });

        const rawResponse = chatCompletion.choices[0]?.message?.content || '{"results": []}';
        
        // Normalise deepseek response whether it sent an array directly or { "prices": [...] }
        let parsed = [];
        try {
            const rawParsed = JSON.parse(rawResponse);
            if (Array.isArray(rawParsed)) {
                parsed = rawParsed;
            } else {
                for (const key of Object.keys(rawParsed)) {
                    if (Array.isArray(rawParsed[key])) {
                        parsed = rawParsed[key];
                        break;
                    }
                }
            }
        } catch (e) {
            console.error("DeepSeek JSON parsing failed", e);
        }

        // ── CACHE & RETURN ──
        PRICE_CACHE[cacheKey] = {
            timestamp: Date.now(),
            data: parsed
        };

        return NextResponse.json({ success: true, cached: false, results: parsed });
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error('Scraping timed out after 45s');
            return NextResponse.json({ success: false, results: [], error: 'Timeout' }, { status: 504 });
        }
        console.error('Critical error in live pricing:', error);
        return NextResponse.json({ success: false, results: [], error: 'Internal Server Error' }, { status: 500 });
    }
}
