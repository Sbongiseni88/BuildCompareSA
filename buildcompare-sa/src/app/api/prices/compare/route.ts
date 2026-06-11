import { NextResponse } from 'next/server';
import { runAIChain } from '@/lib/ai-chain';
import {
    SA_STORES,
    findProductKnowledge,
    type ProductKnowledge,
    type StoreProfile,
} from '@/data/sa-market-knowledge';
import { priceCacheKey, readCachedMatrices } from '@/lib/price-cache';
import { RETAIL_STORES } from '@/lib/retail-matrix';

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

// ── Location Presets (Gauteng) ───────────────────────────────────────
const LOCATION_PRESETS: Record<string, { lat: number; lng: number }> = {
    springs:       { lat: -26.2485, lng: 28.4399 },
    pretoria:      { lat: -25.7461, lng: 28.1881 },
    johannesburg:  { lat: -26.2041, lng: 28.0473 },
    sandton:       { lat: -26.1076, lng: 28.0567 },
    soweto:        { lat: -26.2485, lng: 27.8546 },
    midrand:       { lat: -25.9881, lng: 28.1247 },
    centurion:     { lat: -25.8603, lng: 28.1894 },
    boksburg:      { lat: -26.2120, lng: 28.2575 },
    benoni:        { lat: -26.1893, lng: 28.3207 },
    kempton_park:  { lat: -26.1000, lng: 28.2333 },
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
    source: 'live-scrape' | 'cached-scrape' | 'ai-market-knowledge' | 'ai-estimate';
    sanityFlag: 'ok' | 'low' | 'high';
    sanityNote: string;
    bestValue: boolean;
}

interface CompareResponse {
    success: boolean;
    query: ParsedQuery;
    cheapest: StoreQuote | null;
    results: StoreQuote[];
    marketInsight: string;
    /** Mean of the returned store prices — used by the price-drop notifier. */
    averagePrice: number | null;
    comparisonNote: string;
    priceRange: { min: number; max: number };
    region: string;
    timestamp: string;
    /**
     * Single indicative mid-market estimate when NO store returned a real
     * price (live or cached). Never expanded into a per-store spread —
     * the client renders it as an unverified estimate, not a comparison.
     */
    indicativeEstimate: { priceZar: number; basis: string } | null;
}

// ── Title Case Helper ──────────────────────────────────────────────
function toTitleCase(s: string): string {
    return s.replace(/\b\w+/g, (word) => {
        // Preserve uppercase abbreviations like IBR, PVC, PPC, CEM
        if (word.length <= 3 && word === word.toUpperCase()) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
}

// ── AI Helper ────────────────────────────────────────────────────────────
// Canonical chain (team_standards.md): DeepSeek → Groq → throw, via the
// shared helper in src/lib/ai-chain.ts.

async function callAI(systemPrompt: string): Promise<string> {
    return runAIChain([{ role: 'system', content: systemPrompt }]);
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
    region: string,
    userLat?: number,
    userLng?: number
): Promise<StoreQuote[]> {
    // Fully localized architecture, disconnect from AWS ECS remote proxy.
    const scraperUrl = process.env.SCRAPER_URL || process.env.LOCAL_SCRAPER_URL || 'http://127.0.0.1:8001';
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

        // Real geo distance when the caller supplied (or resolved) coordinates;
        // a rough placeholder otherwise.
        const storeCoord = STORE_COORDS[store.id];
        const distance = (userLat != null && userLng != null && storeCoord)
            ? Math.round(haversine(userLat, userLng, storeCoord.lat, storeCoord.lng) * 10) / 10
            : Math.round(Math.random() * 15 + 2);

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
                distance,
                deliveryCost: store.deliveryCostRange[0],
                totalCost: item.price + store.deliveryCostRange[0],
                laborEstimate: 0, // Calculated separately
                source: 'live-scrape',
                sanityFlag: 'ok',
                sanityNote: '',
                bestValue: false,
            }));
    } catch (err) {
        clearTimeout(timeout);
        console.warn(`Live scrape failed for ${store.name}:`, err);
        return [];
    }
}

// ── STEP 3b: Warm price_cache → real per-store quotes ────────────────────
// Pipeline-scraped prices are genuine independent observations, so they may
// populate store columns. Stores absent from the cache stay missing — they
// resolve to N/A client-side, never mirrored from another store.

async function quotesFromPriceCache(
    query: ParsedQuery,
    userLat?: number,
    userLng?: number,
): Promise<StoreQuote[]> {
    const key = priceCacheKey(query.originalQuery);
    const hits = await readCachedMatrices([key]);
    const cached = hits.get(key);
    if (!cached) return [];

    const quotes: StoreQuote[] = [];
    for (const storeId of RETAIL_STORES) {
        const cell = cached.matrix[storeId];
        if (cell.status !== 'ok' || cell.priceZar == null || cell.priceZar <= 0) continue;
        const profile = SA_STORES.find(s => s.id === storeId);
        if (!profile) continue;
        const coord = STORE_COORDS[storeId];
        const distance = (userLat && userLng && coord)
            ? Math.round(haversine(userLat, userLng, coord.lat, coord.lng) * 10) / 10
            : 8;
        quotes.push({
            store: storeId,
            storeName: cell.storeName,
            storeType: profile.type,
            product: query.product || query.originalQuery,
            brand: query.brand || '',
            size: query.size || '',
            grade: query.grade || '',
            price: cell.priceZar,
            priceConfidence: 'high',
            inStock: true,
            url: profile.searchUrl.replace('{query}', encodeURIComponent(query.normalizedSearchTerms[0] || query.product)),
            distance,
            deliveryCost: profile.deliveryCostRange[0],
            totalCost: cell.priceZar + profile.deliveryCostRange[0],
            laborEstimate: 0,
            source: 'cached-scrape',
            sanityFlag: 'ok',
            sanityNote: '',
            bestValue: false,
        });
    }
    return quotes.sort((a, b) => a.price - b.price);
}

// ── STEP 4: Single indicative estimate (no verified store prices) ────────
// Replaces the old fabricated 5-store fallbacks: the deterministic
// `pricePosition` curve crowned Cashbuild on every line, and the LLM
// "per-store estimate" was invented data wearing a price tag. When nothing
// real exists, the response carries ONE labelled mid-market figure and the
// store columns stay N/A.

async function generateIndicativeEstimate(
    query: ParsedQuery,
    knowledge: ProductKnowledge | null,
): Promise<{ priceZar: number; basis: string } | null> {
    // Knowledge base midpoint first — deterministic, no AI call needed.
    if (knowledge) {
        const [minBase, maxBase] = knowledge.priceRange;
        const brandInfo = query.brand
            ? knowledge.brands.find(b => b.name.toLowerCase() === query.brand!.toLowerCase())
            : null;
        const brandMultiplier = brandInfo ? 1 + (brandInfo.tier * 0.1) : 1.0;
        const gradeInfo = query.grade
            ? knowledge.variants.find(v => v.name.toLowerCase().includes(query.grade!.toLowerCase()))
            : null;
        const gradeMultiplier = gradeInfo?.priceMultiplier || 1.0;
        const raw = ((minBase + maxBase) / 2) * brandMultiplier * gradeMultiplier;
        const priceZar = Math.round(Math.max(minBase * 0.9, Math.min(maxBase * 1.1, raw)) * 100) / 100;
        return {
            priceZar,
            basis: `Indicative SA market range R${minBase}–R${maxBase} (${knowledge.category}); not store-verified.`,
        };
    }

    // Otherwise one AI mid-market figure — explicitly NOT per-store.
    const prompt = `You are a South African building materials pricing expert.
The user is searching for: "${query.originalQuery}"

Estimate ONE typical mid-market retail price in ZAR (2024-2026 SA hardware
retail). Do NOT invent per-store price differences.

Return JSON: { "typicalPrice": 95.00 }
If you cannot price this item reliably, return { "typicalPrice": null }.`;

    try {
        const raw = await callAI(prompt);
        const parsed = JSON.parse(raw);
        const price = typeof parsed.typicalPrice === 'number' && parsed.typicalPrice > 0
            ? Math.round(parsed.typicalPrice * 100) / 100
            : null;
        if (price == null) return null;
        return { priceZar: price, basis: 'Single AI mid-market estimate; not store-verified.' };
    } catch (err) {
        console.error('Indicative estimate failed:', err);
        return null;
    }
}

// ── MAIN ROUTE ───────────────────────────────────────────────────────────

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q');
    const latParam = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
    const lngParam = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;
    const locationName = searchParams.get('location')?.toLowerCase().replace(/\s+/g, '_');
    const radiusParam = searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : undefined;
    // Clamp the search radius to a sane band; 50 km default when absent/garbage.
    const radiusKm = radiusParam != null && Number.isFinite(radiusParam)
        ? Math.min(300, Math.max(5, radiusParam))
        : 50;

    // Resolve coordinates: explicit lat/lng wins, then named location presets.
    let resolvedLat = latParam != null && Number.isFinite(latParam) ? latParam : undefined;
    let resolvedLng = lngParam != null && Number.isFinite(lngParam) ? lngParam : undefined;
    if (resolvedLat == null && resolvedLng == null && locationName && LOCATION_PRESETS[locationName]) {
        resolvedLat = LOCATION_PRESETS[locationName].lat;
        resolvedLng = LOCATION_PRESETS[locationName].lng;
    }
    const hasCoords = resolvedLat != null && resolvedLng != null;
    const regionLabel = locationName
        || (hasCoords ? `${resolvedLat!.toFixed(4)},${resolvedLng!.toFixed(4)}` : 'za');

    if (!rawQuery) {
        return NextResponse.json({ error: 'Missing query parameter "q"' }, { status: 400 });
    }

    // Cache check — keyed on RESOLVED coords (so named locations are
    // location-specific too) and on the radius, which filters the result set.
    const coordKey = hasCoords ? `${resolvedLat!.toFixed(2)}_${resolvedLng!.toFixed(2)}_r${radiusKm}` : 'nocoords';
    const cacheKey = `compare_${rawQuery.toLowerCase().replace(/[^a-z0-9]/g, '')}_${coordKey}`;
    const cached = COMPARE_CACHE[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json({ ...cached.data, cached: true });
    }

    console.log(`\n🔍 PRICE COMPARE AGENT: "${rawQuery}" region=${regionLabel} coords=${resolvedLat},${resolvedLng} radius=${radiusKm}km`);

    // ── STEP 1: Parse Query ──
    const query = await parseQuery(rawQuery);
    console.log(`📋 Parsed: product=${query.product}, brand=${query.brand}, grade=${query.grade}, size=${query.size}`);

    // ── STEP 2: Look up market knowledge ──
    const knowledge = findProductKnowledge(query.product) ||
        findProductKnowledge(query.originalQuery);

    let allQuotes: StoreQuote[] = [];
    let marketInsight = '';

    // ── STEP 3: Try live scraping (parallel across ALL 5 stores) ──
    // Per .agent/skills/retail_matrix_normalization — every store must
    // be queried independently. A failed store later resolves to N/A in
    // the matrix — never mirror another store's value into a missing slot.
    const scrapeStores = SA_STORES; // builders, cashbuild, buildit, leroy_merlin, buco
    const scrapeResults = await Promise.allSettled(
        scrapeStores.map(store =>
            tryLiveScrape(store, query.normalizedSearchTerms, query, regionLabel, resolvedLat, resolvedLng)
        )
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

    // ── STEP 3b: Warm price_cache — real pipeline-scraped prices ──
    if (allQuotes.length === 0) {
        allQuotes = await quotesFromPriceCache(query, resolvedLat, resolvedLng);
        if (allQuotes.length > 0) {
            console.log(`💾 price_cache served ${allQuotes.length} real store prices`);
            marketInsight = `Verified prices from the daily scrape of ${allQuotes.map(q => q.storeName).join(', ')}. Stores not listed had no verified price (N/A).`;
        }
    }

    // ── STEP 4: No verified prices anywhere → single indicative estimate ──
    // Store columns stay empty/N/A. We never fabricate a per-store spread.
    let indicativeEstimate: { priceZar: number; basis: string } | null = null;
    if (allQuotes.length === 0) {
        console.log('⚠️ No verified prices (live or cached). Returning single indicative estimate.');
        indicativeEstimate = await generateIndicativeEstimate(query, knowledge ?? null);
        marketInsight = indicativeEstimate
            ? 'No store-verified prices yet for this item. The figure shown is a single indicative market estimate — supplier columns stay N/A until the daily price pipeline verifies them.'
            : 'No store-verified prices found for this item, and no reliable estimate is available. Try a more specific product name.';
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

    // Apply Title Case and Sanity Checks
    for (const q of deduped) {
        q.product = toTitleCase(q.product);
        q.brand = toTitleCase(q.brand);
        const pk = findProductKnowledge(query.product) || findProductKnowledge(query.originalQuery);
        if (pk?.sanityBounds) {
            if (q.price < pk.sanityBounds.min) {
                q.sanityFlag = 'low';
                q.sanityNote = `Price looks low\u2014verify if per unit or per pack (expected ${pk.sanityBounds.label}: R${pk.sanityBounds.min}\u2013R${pk.sanityBounds.max})`;
            } else if (q.price > pk.sanityBounds.max) {
                q.sanityFlag = 'high';
                q.sanityNote = `Above typical 2026 Gauteng range for ${pk.sanityBounds.label}`;
            } else {
                q.sanityFlag = 'ok';
                q.sanityNote = '';
            }
        }
    }

    // ── Radius filter ──
    // Only meaningful when coordinates were resolved (distances are then
    // deterministic store-coordinate estimates). Never empty the result set
    // because of the filter — fall back to the full set with a note.
    let inRange = deduped;
    if (hasCoords && deduped.length > 0) {
        const within = deduped.filter(q => q.distance <= radiusKm);
        if (within.length > 0 && within.length < deduped.length) {
            inRange = within;
            marketInsight = `${marketInsight} Showing ${within.length} of ${deduped.length} stores within ${radiusKm} km.`.trim();
        } else if (within.length === 0) {
            marketInsight = `${marketInsight} No stores within ${radiusKm} km — showing nearest available pricing.`.trim();
        }
    }

    // Mark best value (cheapest totalCost)
    if (inRange.length > 0) {
        const bestIdx = inRange.reduce((best, q, i) => q.totalCost < inRange[best].totalCost ? i : best, 0);
        inRange.forEach((q, i) => { q.bestValue = i === bestIdx; });
    }

    const cheapest = inRange[0] || null;
    const prices = inRange.map(q => q.price);
    const averagePrice = prices.length > 0
        ? Math.round((prices.reduce((sum, p) => sum + p, 0) / prices.length) * 100) / 100
        : null;

    const response: CompareResponse = {
        success: true,
        query,
        cheapest,
        results: inRange,
        marketInsight,
        averagePrice,
        comparisonNote: knowledge?.comparisonNote || 'Compare like-for-like products only.',
        priceRange: {
            min: Math.min(...prices, Infinity),
            max: Math.max(...prices, 0),
        },
        region: regionLabel,
        timestamp: new Date().toISOString(),
        indicativeEstimate,
    };

    // Cache
    COMPARE_CACHE[cacheKey] = { timestamp: Date.now(), data: response };

    console.log(`✅ Returning ${inRange.length} quotes. Cheapest: ${cheapest?.storeName} @ R${cheapest?.price}`);
    return NextResponse.json(response);
}
