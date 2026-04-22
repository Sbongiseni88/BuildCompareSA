import { NextResponse } from 'next/server';
import { deepseekClient, isDeepseekConfigured } from '@/lib/deepseek';
import { groqClient, isGroqConfigured } from '@/lib/groq';
import {
    SA_STORES,
    findProductKnowledge,
    type ProductKnowledge,
    type StoreProfile,
} from '@/data/sa-market-knowledge';

export const maxDuration = 60;

// ── Haversine distance (km) ──────────────────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Known store coordinates (SA) ─────────────────────────────────────────
const STORE_COORDS: Record<string, { lat: number; lng: number }> = {
    builders:      { lat: -26.1076, lng: 27.9519 },  // Builders Warehouse Strubens Valley
    cashbuild:     { lat: -26.1498, lng: 27.8621 },  // Cashbuild Roodepoort
    buildit:       { lat: -26.2339, lng: 28.0289 },  // Build it Gold Reef
    leroy_merlin:  { lat: -26.0236, lng: 28.0131 },  // Leroy Merlin Fourways
    buco:          { lat: -26.1445, lng: 27.8554 },  // BUCO Roodepoort
};

// ── Cache ────────────────────────────────────────────────────────────────
const COMPARE_CACHE: Record<string, { timestamp: number; data: any }> = {};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── Types ────────────────────────────────────────────────────────────────
interface ParsedQuery {
    originalQuery: string;
    product: string;
    category: string;
    brand: string | null;
    size: string | null;
    grade: string | null;
    normalizedSearchTerms: string[];
}

interface StoreQuote {
    store: string;
    storeName: string;
    storeType: 'chain' | 'independent';
    product: string;
    brand: string;
    size: string;
    grade: string;
    price: number;
    priceConfidence: 'high' | 'medium' | 'low';
    inStock: boolean;
    url: string;
    distance: number;
    deliveryCost: number;
    totalCost: number;
    laborEstimate: number;
    source: 'live-scrape' | 'ai-market-knowledge' | 'ai-estimate';
}

interface CompareResponse {
    success: boolean;
    query: ParsedQuery;
    cheapest: StoreQuote | null;
    results: StoreQuote[];
    marketInsight: string;
    comparisonNote: string;
    priceRange: { min: number; max: number };
    region: string;
    timestamp: string;
}

// ── AI Helper ────────────────────────────────────────────────────────────

async function callAI(systemPrompt: string): Promise<string> {
    // Try DeepSeek first, then Groq
    if (isDeepseekConfigured) {
        try {
            const res = await deepseekClient.chat.completions.create({
                messages: [{ role: 'system', content: systemPrompt }],
                model: 'deepseek-chat',
                temperature: 0.1,
                response_format: { type: 'json_object' },
            });
            const content = res.choices[0]?.message?.content;
            if (content) return content;
        } catch (err: any) {
            console.warn('DeepSeek failed, trying Groq:', err.message);
        }
    }
    if (isGroqConfigured) {
        const res = await groqClient.chat.completions.create({
            messages: [{ role: 'system', content: systemPrompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            response_format: { type: 'json_object' },
        });
        return res.choices[0]?.message?.content || '{}';
    }
    throw new Error('No AI API configured');
}

// ── STEP 1: Parse the Query ──────────────────────────────────────────────

async function parseQuery(rawQuery: string): Promise<ParsedQuery> {
    const knowledge = findProductKnowledge(rawQuery);

    const prompt = `You are a South African building materials expert.
Parse this user search query into structured attributes.

QUERY: "${rawQuery}"

${knowledge ? `KNOWN PRODUCT CATEGORY: ${knowledge.category}
KNOWN BRANDS IN SA: ${knowledge.brands.map(b => b.name).join(', ')}
KNOWN VARIANTS/GRADES: ${knowledge.variants.map(v => v.name).join(', ')}
STANDARD SIZES: ${knowledge.standardSizes.join(', ')}
DEFAULT UNIT: ${knowledge.defaultUnit}` : ''}

Return a JSON object:
{
  "product": "the core product name (e.g. 'cement', 'bricks', 'roof sheet')",
  "category": "one of: cement, bricks, sand, steel, timber, paint, roofing, plumbing, electrical, tiles, hardware, other",
  "brand": "specific brand if mentioned, otherwise null",
  "size": "size/weight if mentioned (e.g. '50kg', '5L'), otherwise null",
  "grade": "grade/type if mentioned (e.g. '42.5N', 'IBR 0.47mm'), otherwise null",
  "normalizedSearchTerms": ["array", "of", "simplified", "search", "terms", "to", "use", "across", "multiple", "stores"]
}

Rules:
- If brand is mentioned (e.g. "AfriSam"), extract it.
- If grade is mentioned (e.g. "CEM II", "42.5N"), extract it.
- normalizedSearchTerms should be 2-3 simplified versions for searching stores, e.g. ["afrisam cement 50kg", "cement 50kg", "afrisam cement"]
- ONLY return valid JSON.`;

    try {
        const raw = await callAI(prompt);
        const parsed = JSON.parse(raw);
        return {
            originalQuery: rawQuery,
            product: parsed.product || rawQuery,
            category: parsed.category || knowledge?.category || 'other',
            brand: parsed.brand || null,
            size: parsed.size || knowledge?.standardSizes?.[0] || null,
            grade: parsed.grade || null,
            normalizedSearchTerms: parsed.normalizedSearchTerms || [rawQuery],
        };
    } catch {
        return {
            originalQuery: rawQuery,
            product: rawQuery,
            category: knowledge?.category || 'other',
            brand: null,
            size: null,
            grade: null,
            normalizedSearchTerms: [rawQuery],
        };
    }
}

// ── STEP 2: Try Live Scraping ────────────────────────────────────────────

async function tryLiveScrape(
    store: StoreProfile,
    searchTerms: string[],
    query: ParsedQuery,
    region: string
): Promise<StoreQuote[]> {
    // Fully localized architecture, disconnect from AWS ECS remote proxy.
    const scraperUrl = process.env.LOCAL_SCRAPER_URL || 'http://127.0.0.1:8001';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
        // Use the first (most specific) search term
        const searchTerm = searchTerms[0];
        const pyRes = await fetch(
            `${scraperUrl}/scrape?store=${encodeURIComponent(store.id)}&query=${encodeURIComponent(searchTerm)}&region=${encodeURIComponent(region)}`,
            { signal: controller.signal }
        );
        clearTimeout(timeout);

        if (!pyRes.ok) return [];

        const data = await pyRes.json();
        if (!data.raw_text || data.raw_text.length < 20) return [];

        // Parse with AI
        const parsePrompt = `You are a South African pricing data extractor.
Store: "${store.name}"
User searched for: "${query.originalQuery}"
Product category: ${query.category}
${query.brand ? `Specific brand requested: ${query.brand}` : ''}
${query.grade ? `Grade/type: ${query.grade}` : ''}
${query.size ? `Size: ${query.size}` : ''}

Extract MATCHING products from this raw web text. Only extract products that match what the user is looking for.

Return a JSON object with a "results" key containing an array:
{
  "results": [
    {
      "product": "Full product name as shown on website",
      "brand": "Brand name",
      "size": "Size/weight",
      "grade": "Grade/type if visible",
      "price": 99.95,
      "inStock": true
    }
  ]
}

CRITICAL:
- Only extract products that MATCH the user's search (same product type).
- Prices MUST be floats. No strings. No currency symbols.
- If NO matching products found, return: {"results": []}
- Do NOT hallucinate. Only use data from the text below.

--- RAW WEB TEXT ---
${data.raw_text.slice(0, 15000)}
--- END ---`;

        const aiResponse = await callAI(parsePrompt);
        const parsed = JSON.parse(aiResponse);
        const items = Array.isArray(parsed.results) ? parsed.results : [];

        return items
            .filter((item: any) => typeof item.price === 'number' && item.price > 0)
            .map((item: any): StoreQuote => ({
                store: store.id,
                storeName: store.name,
                storeType: store.type,
                product: item.product || query.product,
                brand: item.brand || query.brand || 'Generic',
                size: item.size || query.size || '',
                grade: item.grade || query.grade || '',
                price: item.price,
                priceConfidence: 'high',
                inStock: item.inStock ?? true,
                url: store.searchUrl.replace('{query}', encodeURIComponent(searchTerms[0])),
                distance: Math.round(Math.random() * 15 + 2), // Will be replaced by real geo later
                deliveryCost: store.deliveryCostRange[0],
                totalCost: item.price + store.deliveryCostRange[0],
                laborEstimate: 0, // Calculated separately
                source: 'live-scrape',
            }));
    } catch (err) {
        clearTimeout(timeout);
        console.warn(`Live scrape failed for ${store.name}:`, err);
        return [];
    }
}

// ── STEP 3: Generate Market-Knowledge Estimates ──────────────────────────

function generateMarketEstimates(
    query: ParsedQuery,
    knowledge: ProductKnowledge,
    userLat?: number,
    userLng?: number
): StoreQuote[] {
    const quotes: StoreQuote[] = [];

    // Find the brand tier
    const brandInfo = query.brand
        ? knowledge.brands.find(b => b.name.toLowerCase() === query.brand!.toLowerCase())
        : null;
    const brandMultiplier = brandInfo ? 1 + (brandInfo.tier * 0.1) : 1.0;

    // Find the grade multiplier
    const gradeInfo = query.grade
        ? knowledge.variants.find(v => v.name.toLowerCase().includes(query.grade!.toLowerCase()))
        : null;
    const gradeMultiplier = gradeInfo?.priceMultiplier || 1.0;

    const [minBase, maxBase] = knowledge.priceRange;
    const midBase = (minBase + maxBase) / 2;

    for (const store of SA_STORES) {
        // Calculate store-specific pricing
        const storeMultiplier = 1 + (store.pricePosition * 0.1);
        const finalPrice = Math.round(
            midBase * brandMultiplier * gradeMultiplier * storeMultiplier * 100
        ) / 100;

        // Clamp to realistic range
        const clampedPrice = Math.max(minBase * 0.9, Math.min(maxBase * 1.1, finalPrice));

        const branchName = store.name;
        // Calculate real distance if user coords available
        const storeCoord = STORE_COORDS[store.id];
        const distance = (userLat && userLng && storeCoord)
            ? Math.round(haversine(userLat, userLng, storeCoord.lat, storeCoord.lng) * 10) / 10
            : Math.round(Math.random() * 12 + 3);

        const laborRange = knowledge.laborPerUnit;
        const laborEstimate = laborRange[0] + (laborRange[1] - laborRange[0]) * 0.5;

        quotes.push({
            store: store.id,
            storeName: branchName,
            storeType: store.type,
            product: `${query.brand || knowledge.brands[0]?.name || ''} ${query.product} ${query.size || knowledge.defaultUnit} ${query.grade || ''}`.trim(),
            brand: query.brand || knowledge.brands[0]?.name || 'Generic',
            size: query.size || knowledge.defaultUnit,
            grade: query.grade || knowledge.variants[0]?.name || '',
            price: clampedPrice,
            priceConfidence: 'medium',
            inStock: Math.random() > 0.1, // 90% chance in stock
            url: store.searchUrl.replace('{query}', encodeURIComponent(query.normalizedSearchTerms[0] || query.product)),
            distance,
            deliveryCost: store.deliveryCostRange[0],
            totalCost: clampedPrice + store.deliveryCostRange[0],
            laborEstimate: Math.round(laborEstimate),
            source: 'ai-market-knowledge',
        });
    }

    // Sort by price
    return quotes.sort((a, b) => a.price - b.price);
}

// ── STEP 4: Full AI Estimate (No market knowledge match) ─────────────────

async function generateAIEstimate(
    query: ParsedQuery,
    userLat?: number,
    userLng?: number
): Promise<StoreQuote[]> {

    const prompt = `You are a South African building materials pricing expert.
The user is searching for: "${query.originalQuery}"
Location: South Africa

Based on your knowledge of typical 2024-2026 South African retail pricing,
provide realistic price estimates from these stores:
1. Builders Warehouse
2. Cashbuild
3. Build it
4. Leroy Merlin
5. BUCO

Return JSON:
{
  "results": [
    {
      "store": "Store Name",
      "storeId": "builders|cashbuild|buildit|leroy_merlin|buco",
      "product": "Full standardized product name",
      "brand": "Brand if applicable",
      "size": "Size/weight",
      "grade": "Grade if applicable",
      "price": 99.95,
      "laborEstimate": 25.00,
      "inStock": true,
      "priceConfidence": "medium"
    }
  ],
  "marketInsight": "Brief 1-2 sentence explanation of the pricing pattern"
}

CRITICAL:
- Prices must be realistic ZAR floats based on actual SA market patterns.
- Do NOT hallucinate — if you're unsure, set priceConfidence to "low".
- laborEstimate = estimated installation labor cost per unit in ZAR.
- Big chains are rarely cheapest. Factor in store-specific pricing patterns.`;

    try {
        const raw = await callAI(prompt);
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed.results) ? parsed.results : [];

        return items.map((item: any): StoreQuote => {
            const storeProfile = SA_STORES.find(s => s.id === item.storeId) || SA_STORES[0];
            return {
                store: item.storeId || storeProfile.id,
                storeName: item.store || storeProfile.name,
                storeType: storeProfile.type,
                product: item.product || query.originalQuery,
                brand: item.brand || 'Generic',
                size: item.size || '',
                grade: item.grade || '',
                price: typeof item.price === 'number' ? item.price : 95,
                priceConfidence: item.priceConfidence || 'low',
                inStock: item.inStock ?? true,
                url: storeProfile.searchUrl.replace('{query}', encodeURIComponent(query.originalQuery)),
                distance: (userLat && userLng && STORE_COORDS[item.storeId]) ? Math.round(haversine(userLat, userLng, STORE_COORDS[item.storeId].lat, STORE_COORDS[item.storeId].lng) * 10) / 10 : Math.round(Math.random() * 15 + 3),
                deliveryCost: storeProfile.deliveryCostRange[0],
                totalCost: (typeof item.price === 'number' ? item.price : 95) + storeProfile.deliveryCostRange[0],
                laborEstimate: typeof item.laborEstimate === 'number' ? item.laborEstimate : 0,
                source: 'ai-estimate',
            };
        }).sort((a: StoreQuote, b: StoreQuote) => a.price - b.price);
    } catch (err) {
        console.error('AI estimate failed:', err);
        return [];
    }
}

// ── MAIN ROUTE ───────────────────────────────────────────────────────────

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q');
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;

    if (!rawQuery) {
        return NextResponse.json({ error: 'Missing query parameter "q"' }, { status: 400 });
    }

    // Cache check (include coords in key for location-specific caching)
    const coordKey = lat && lng ? `${lat.toFixed(2)}_${lng.toFixed(2)}` : 'nocoords';
    const cacheKey = `compare_${rawQuery.toLowerCase().replace(/[^a-z0-9]/g, '')}_${coordKey}`;
    const cached = COMPARE_CACHE[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json({ ...cached.data, cached: true });
    }

    console.log(`\n🔍 PRICE COMPARE AGENT: "${rawQuery}" coords=${lat},${lng}`);

    // ── STEP 1: Parse Query ──
    const query = await parseQuery(rawQuery);
    console.log(`📋 Parsed: product=${query.product}, brand=${query.brand}, grade=${query.grade}, size=${query.size}`);

    // ── STEP 2: Look up market knowledge ──
    const knowledge = findProductKnowledge(query.product) ||
        findProductKnowledge(query.originalQuery);

    let allQuotes: StoreQuote[] = [];
    let marketInsight = '';

    // ── STEP 3: Try live scraping (parallel across stores) ──
    const scrapeStores = SA_STORES.slice(0, 3); // Builders, Cashbuild, Build it
    const scrapeResults = await Promise.allSettled(
        scrapeStores.map(store => tryLiveScrape(store, query.normalizedSearchTerms, query, 'za'))
    );

    for (const result of scrapeResults) {
        if (result.status === 'fulfilled' && result.value.length > 0) {
            allQuotes.push(...result.value);
        }
    }

    if (allQuotes.length > 0) {
        console.log(`✅ Live scrape found ${allQuotes.length} results`);
        marketInsight = `Live prices retrieved from ${allQuotes.map(q => q.storeName).filter((v, i, a) => a.indexOf(v) === i).join(', ')}.`;
    }

    // ── STEP 4: Fill in remaining stores with market knowledge ──
    if (knowledge) {
        const coveredStores = new Set(allQuotes.map(q => q.store));
        const missingStores = SA_STORES.filter(s => !coveredStores.has(s.id));

        if (missingStores.length > 0) {
            const estimates = generateMarketEstimates(query, knowledge, lat, lng);
            const newEstimates = estimates.filter(e => !coveredStores.has(e.store));
            allQuotes.push(...newEstimates);
            console.log(`📊 Added ${newEstimates.length} market-knowledge estimates`);
        }

        // Add labor estimates to live-scrape results that don't have them
        const laborRange = knowledge.laborPerUnit;
        const midLabor = laborRange[0] + (laborRange[1] - laborRange[0]) * 0.5;
        for (const q of allQuotes) {
            if (q.laborEstimate === 0 && midLabor > 0) {
                q.laborEstimate = Math.round(midLabor);
            }
            q.totalCost = q.price + q.deliveryCost;
        }

        if (!marketInsight) {
            marketInsight = `${knowledge.comparisonNote} Typical range: R${knowledge.priceRange[0]}–R${knowledge.priceRange[1]} per ${knowledge.defaultUnit}.`;
        }
    }

    // ── STEP 5: Fallback to full AI estimate if still empty ──
    if (allQuotes.length === 0) {
        console.log('⚠️ No results from scraping or knowledge base. Using AI estimate...');
        allQuotes = await generateAIEstimate(query, lat, lng);
        marketInsight = 'Prices are AI estimates based on typical SA market patterns. Confirm at store before purchasing.';
    }

    // ── STEP 6: Sort, deduplicate, and prepare response ──
    allQuotes.sort((a, b) => a.price - b.price);

    // Deduplicate by store (keep cheapest per store)
    const seen = new Set<string>();
    const deduped = allQuotes.filter(q => {
        if (seen.has(q.store)) return false;
        seen.add(q.store);
        return true;
    });

    const cheapest = deduped[0] || null;
    const prices = deduped.map(q => q.price);

    const response: CompareResponse = {
        success: true,
        query,
        cheapest,
        results: deduped,
        marketInsight,
        comparisonNote: knowledge?.comparisonNote || 'Compare like-for-like products only.',
        priceRange: {
            min: Math.min(...prices, Infinity),
            max: Math.max(...prices, 0),
        },
        region: lat && lng ? `${lat.toFixed(4)},${lng.toFixed(4)}` : 'za',
        timestamp: new Date().toISOString(),
    };

    // Cache
    COMPARE_CACHE[cacheKey] = { timestamp: Date.now(), data: response };

    console.log(`✅ Returning ${deduped.length} quotes. Cheapest: ${cheapest?.storeName} @ R${cheapest?.price}`);
    return NextResponse.json(response);
}
