/**
 * South African Building Materials Market Knowledge Base
 * 
 * This is the AI agent's "mental model" — real-world pricing patterns,
 * store characteristics, product tiers, and regional adjustments.
 * 
 * Sources: Typical SA hardware retail pricing patterns (2024–2026).
 * These are NOT live prices — they are bounded ranges the AI uses
 * to validate scraped data and generate realistic estimates when
 * live data is unavailable.
 *
 * ⚠️ IMPORTANT: REFERENCE ONLY ⚠️
 * This file is NOT active filter data.
 * It is NOT used for runtime routing, UI filtering, or functional logic.
 * It strictly serves as LLM knowledge context.
 */

// ─── Store Profiles ──────────────────────────────────────────────────────
export interface StoreProfile {
    id: string;
    name: string;
    type: 'chain' | 'independent';
    /** Price positioning relative to market average: -1 = cheap, 0 = average, 1 = premium */
    pricePosition: number;
    /** Typical stock reliability 0-1 */
    stockReliability: number;
    /** Whether they offer delivery */
    hasDelivery: boolean;
    /** Typical delivery cost range */
    deliveryCostRange: [number, number];
    /** Search URL template */
    searchUrl: string;
    /** 
     * Locations by region 
     * ⚠️ DEPRECATED FOR LOGIC: This field is provided for AI context only.
     * Do NOT use this for UI region filtering or proximity matching.
     * All live logic uses Haversine distance tracking against true lat/lng.
     */
    regionPresence: Record<string, string[]>;
}

export const SA_STORES: StoreProfile[] = [
    {
        id: 'builders',
        name: 'Builders Warehouse',
        type: 'chain',
        pricePosition: 0.3,  // Slightly above average — convenience premium
        stockReliability: 0.9,
        hasDelivery: true,
        deliveryCostRange: [150, 500],
        searchUrl: 'https://www.builders.co.za/search/?text={query}',
        regionPresence: {
            gauteng: ['Builders Warehouse Strubens Valley', 'Builders Warehouse Glen Eagles', 'Builders Warehouse Fourways', 'Builders Warehouse Boksburg'],
            'cape-town': ['Builders Warehouse Milnerton', 'Builders Warehouse Bellville', 'Builders Warehouse Somerset West'],
            durban: ['Builders Warehouse Umhlanga', 'Builders Warehouse Springfield', 'Builders Warehouse Pinetown'],
        }
    },
    {
        id: 'cashbuild',
        name: 'Cashbuild',
        type: 'chain',
        pricePosition: -0.2,  // Slightly below average — value-focused
        stockReliability: 0.85,
        hasDelivery: true,
        deliveryCostRange: [100, 350],
        searchUrl: 'https://www.cashbuild.co.za/search?q={query}',
        regionPresence: {
            gauteng: ['Cashbuild Roodepoort', 'Cashbuild Soweto', 'Cashbuild Kempton Park', 'Cashbuild Alberton'],
            'cape-town': ['Cashbuild Khayelitsha', 'Cashbuild Mitchells Plain', 'Cashbuild Brackenfell'],
            durban: ['Cashbuild Chatsworth', 'Cashbuild KwaMashu', 'Cashbuild Phoenix'],
        }
    },
    {
        id: 'buildit',
        name: 'Build it',
        type: 'chain',
        pricePosition: -0.1,  // Competitive pricing
        stockReliability: 0.8,
        hasDelivery: true,
        deliveryCostRange: [100, 400],
        searchUrl: 'https://www.buildit.co.za/search?q={query}',
        regionPresence: {
            gauteng: ['Build it Gold Reef', 'Build it Randburg', 'Build it Benoni'],
            'cape-town': ['Build it Strand', 'Build it Parow'],
            durban: ['Build it Tongaat', 'Build it Amanzimtoti'],
        }
    },
    {
        id: 'leroy_merlin',
        name: 'Leroy Merlin',
        type: 'chain',
        pricePosition: 0.1,  // Slightly above average — quality brand focus
        stockReliability: 0.88,
        hasDelivery: true,
        deliveryCostRange: [99, 399],
        searchUrl: 'https://leroymerlin.co.za/catalogsearch/result/?q={query}',
        regionPresence: {
            gauteng: ['Leroy Merlin Fourways', 'Leroy Merlin Greenstone', 'Leroy Merlin Boksburg'],
            'cape-town': ['Leroy Merlin Cape Gate', 'Leroy Merlin Brackenfell'],
            durban: ['Leroy Merlin Springfield'],
        }
    },
    {
        id: 'buco',
        name: 'BUCO',
        type: 'chain',
        pricePosition: 0.0,  // Market average
        stockReliability: 0.82,
        hasDelivery: true,
        deliveryCostRange: [120, 450],
        searchUrl: 'https://buco.co.za/?s={query}&post_type=product',
        regionPresence: {
            gauteng: ['BUCO Roodepoort', 'BUCO Boksburg', 'BUCO Pretoria'],
            'cape-town': ['BUCO Strand', 'BUCO George'],
            durban: ['BUCO Pinetown'],
        }
    },
];

// ─── Product Category Knowledge ──────────────────────────────────────────

export interface ProductKnowledge {
    category: string;
    /** Common product names the user might search for */
    aliases: string[];
    /** Known brands in SA market with price positioning */
    brands: {
        name: string;
        /** -1 = budget, 0 = mid-range, 1 = premium */
        tier: number;
    }[];
    /** Product variants/grades that affect price */
    variants: {
        name: string;
        /** Multiplier relative to base: 1.0 = base, 1.1 = 10% more */
        priceMultiplier: number;
    }[];
    /** Standard sizes/weights */
    standardSizes: string[];
    /** Price range per standard unit [min, max] ZAR */
    priceRange: [number, number];
    /** The most commonly sold size/unit */
    defaultUnit: string;
    /** Typical labour cost per unit for installation */
    laborPerUnit: [number, number];
    /** Key comparison note */
    comparisonNote: string;
}

export const SA_PRODUCT_KNOWLEDGE: ProductKnowledge[] = [
    {
        category: 'cement',
        aliases: ['cement', 'concrete', 'mortar', 'screed', 'plaster mix'],
        brands: [
            { name: 'PPC', tier: 0.3 },        // Slightly premium
            { name: 'AfriSam', tier: 0 },       // Mid-range
            { name: 'Lafarge', tier: 0.1 },     // Slightly above mid
            { name: 'NPC', tier: -0.2 },        // Budget
            { name: 'Sephaku', tier: -0.1 },    // Value
        ],
        variants: [
            { name: '32.5N', priceMultiplier: 1.0 },   // Base grade — cheaper
            { name: '42.5N', priceMultiplier: 1.08 },   // Higher strength — ~R5-R10 more
            { name: '52.5N', priceMultiplier: 1.2 },    // Specialist
        ],
        standardSizes: ['50kg'],
        priceRange: [85, 120],
        defaultUnit: '50kg bag',
        laborPerUnit: [25, 45],   // Labour to mix and apply per bag
        comparisonNote: 'Always compare same grade (32.5N vs 32.5N). Price difference between grades is typically R5–R10.',
    },
    {
        category: 'bricks',
        aliases: ['brick', 'block', 'maxi brick', 'face brick', 'cement block', 'paver', 'stock brick'],
        brands: [
            { name: 'Corobrik', tier: 0.5 },    // Premium
            { name: 'Everite', tier: 0 },        // Mid-range
            { name: 'Generic', tier: -0.3 },     // Budget
        ],
        variants: [
            { name: 'Stock Brick', priceMultiplier: 1.0 },
            { name: 'Face Brick NFP', priceMultiplier: 1.8 },
            { name: 'Cement Block 190mm', priceMultiplier: 2.5 },
            { name: 'Maxi Brick', priceMultiplier: 1.3 },
        ],
        standardSizes: ['222x106x73mm', '290x140x90mm (Maxi)'],
        priceRange: [2.50, 12.00],
        defaultUnit: 'each',
        laborPerUnit: [1.50, 3.50],  // Per brick laid
        comparisonNote: 'Never compare face bricks to stock bricks. Per-thousand pricing: multiply by 1000 for bulk.',
    },
    {
        category: 'sand',
        aliases: ['sand', 'building sand', 'plaster sand', 'river sand', 'fill'],
        brands: [
            { name: 'Generic', tier: 0 },
        ],
        variants: [
            { name: 'Building Sand', priceMultiplier: 1.0 },
            { name: 'Plaster Sand', priceMultiplier: 0.9 },
            { name: 'River Sand', priceMultiplier: 1.2 },
        ],
        standardSizes: ['per m³', '30kg bag'],
        priceRange: [40, 750],
        defaultUnit: 'per m³',
        laborPerUnit: [0, 0],
        comparisonNote: 'Bulk (m³) is always cheaper per unit than bagged sand. Transport cost is a major factor.',
    },
    {
        category: 'steel',
        aliases: ['steel', 'rebar', 'reinforcing', 'y-bar', 'mesh', 'reinforcement'],
        brands: [
            { name: 'ArcelorMittal', tier: 0.2 },
            { name: 'Generic', tier: 0 },
        ],
        variants: [
            { name: 'Y10 Rebar', priceMultiplier: 0.8 },
            { name: 'Y12 Rebar', priceMultiplier: 1.0 },
            { name: 'Y16 Rebar', priceMultiplier: 1.5 },
            { name: 'Ref 193 Mesh', priceMultiplier: 3.5 },
        ],
        standardSizes: ['6m length', '2.4m x 5.4m sheet (mesh)'],
        priceRange: [100, 650],
        defaultUnit: '6m length',
        laborPerUnit: [30, 80],
        comparisonNote: 'Y-bar size (Y10/Y12/Y16) dramatically affects price. Always compare same diameter.',
    },
    {
        category: 'timber',
        aliases: ['timber', 'wood', 'plank', 'beam', 'pole', 'pine', 'plywood', 'board'],
        brands: [
            { name: 'SA Pine (treated)', tier: 0 },
            { name: 'Meranti', tier: 0.6 },
        ],
        variants: [
            { name: '38x38mm', priceMultiplier: 0.5 },
            { name: '38x76mm', priceMultiplier: 0.8 },
            { name: '38x114mm', priceMultiplier: 1.0 },
            { name: '38x152mm', priceMultiplier: 1.3 },
            { name: '50x76mm', priceMultiplier: 1.1 },
        ],
        standardSizes: ['3m', '3.6m', '4.8m', '6m'],
        priceRange: [45, 350],
        defaultUnit: '3m length',
        laborPerUnit: [20, 60],
        comparisonNote: 'Cross-section AND length both affect price. CCA treated costs more than untreated.',
    },
    {
        category: 'paint',
        aliases: ['paint', 'primer', 'sealer', 'coat', 'varnish', 'wood stain', 'damp seal'],
        brands: [
            { name: 'Dulux', tier: 0.5 },
            { name: 'Plascon', tier: 0.4 },
            { name: 'Fired Earth', tier: 0.7 },
            { name: 'Prominent', tier: -0.3 },
            { name: 'Senate', tier: -0.4 },
        ],
        variants: [
            { name: 'Interior PVA', priceMultiplier: 1.0 },
            { name: 'Exterior Acrylic', priceMultiplier: 1.3 },
            { name: 'Roof Paint', priceMultiplier: 1.5 },
            { name: 'Primer/Sealer', priceMultiplier: 0.9 },
            { name: 'Enamel', priceMultiplier: 1.2 },
        ],
        standardSizes: ['1L', '5L', '20L'],
        priceRange: [60, 2500],
        defaultUnit: '5L',
        laborPerUnit: [35, 80],
        comparisonNote: 'Paint quality varies enormously. Premium brands last 2-3x longer, so price per year matters more.',
    },
    {
        category: 'roofing',
        aliases: ['roof', 'roofing', 'IBR', 'corrugated', 'roof sheet', 'ridge cap', 'fascia'],
        brands: [
            { name: 'Safal', tier: 0.2 },
            { name: 'Global Roofing', tier: 0 },
            { name: 'Generic', tier: -0.2 },
        ],
        variants: [
            { name: 'IBR 0.47mm', priceMultiplier: 1.0 },
            { name: 'IBR 0.53mm', priceMultiplier: 1.15 },
            { name: 'Corrugated 0.47mm', priceMultiplier: 0.95 },
            { name: 'Harvey Tile', priceMultiplier: 2.5 },
        ],
        standardSizes: ['1.8m', '2.4m', '3m', '3.6m', '4.8m', '6m'],
        priceRange: [120, 650],
        defaultUnit: '3.6m sheet',
        laborPerUnit: [40, 90],
        comparisonNote: 'Sheet thickness (0.47 vs 0.53mm) affects durability and price. Length matters enormously.',
    },
    {
        category: 'plumbing',
        aliases: ['pipe', 'plumbing', 'fitting', 'valve', 'tap', 'toilet', 'basin', 'geyser', 'drain'],
        brands: [
            { name: 'Marley', tier: 0.1 },
            { name: 'DPI', tier: 0 },
            { name: 'Cobra', tier: 0.3 },
        ],
        variants: [
            { name: '15mm PVC', priceMultiplier: 0.5 },
            { name: '20mm PVC', priceMultiplier: 0.7 },
            { name: '40mm PVC', priceMultiplier: 1.0 },
            { name: '110mm PVC', priceMultiplier: 2.5 },
            { name: '15mm Copper', priceMultiplier: 4.0 },
        ],
        standardSizes: ['1m', '3m', '6m'],
        priceRange: [15, 1500],
        defaultUnit: 'per length',
        laborPerUnit: [50, 250],
        comparisonNote: 'Copper pipe is 3-4x the price of PVC. Labour on plumbing is high — certified plumber rates apply.',
    },
    {
        category: 'electrical',
        aliases: ['cable', 'wire', 'electrical', 'conduit', 'breaker', 'DB board', 'switch', 'plug'],
        brands: [
            { name: 'Surfix', tier: 0 },
            { name: 'CBI', tier: 0.1 },
        ],
        variants: [
            { name: '1.5mm Twin & Earth', priceMultiplier: 0.6 },
            { name: '2.5mm Twin & Earth', priceMultiplier: 1.0 },
            { name: '4mm Twin & Earth', priceMultiplier: 1.5 },
            { name: '6mm Twin & Earth', priceMultiplier: 2.2 },
        ],
        standardSizes: ['10m', '50m', '100m'],
        priceRange: [150, 3500],
        defaultUnit: '100m roll',
        laborPerUnit: [300, 800],
        comparisonNote: 'Cable size (1.5mm vs 2.5mm vs 4mm) has HUGE impact on price. Must match circuit requirements.',
    },
    {
        category: 'tiles',
        aliases: ['tile', 'floor tile', 'wall tile', 'ceramic', 'porcelain', 'mosaic'],
        brands: [
            { name: 'Italtile', tier: 0.5 },
            { name: 'CTM', tier: 0.3 },
            { name: 'Generic Import', tier: -0.3 },
        ],
        variants: [
            { name: 'Ceramic 300x300mm', priceMultiplier: 0.6 },
            { name: 'Ceramic 600x600mm', priceMultiplier: 1.0 },
            { name: 'Porcelain 600x600mm', priceMultiplier: 1.5 },
            { name: 'Porcelain 800x800mm', priceMultiplier: 2.0 },
        ],
        standardSizes: ['per m²', 'per box (1.44m²)'],
        priceRange: [80, 650],
        defaultUnit: 'per m²',
        laborPerUnit: [120, 280],
        comparisonNote: 'Ceramic vs Porcelain is the biggest price differentiator. Always compare same material type.',
    },
    {
        category: 'hardware',
        aliases: ['hammer', 'drill', 'saw', 'screwdriver', 'spanner', 'wrench', 'bolt', 'screw', 'nail', 'hinge', 'lock', 'wheelbarrow', 'tape measure', 'level', 'trowel', 'grinder', 'tool'],
        brands: [
            { name: 'Makita', tier: 0.5 },
            { name: 'Bosch', tier: 0.4 },
            { name: 'DeWalt', tier: 0.5 },
            { name: 'Stanley', tier: 0.2 },
            { name: 'Lasher', tier: 0 },
            { name: 'Generic', tier: -0.4 },
        ],
        variants: [
            { name: 'Hand Tool', priceMultiplier: 1.0 },
            { name: 'Power Tool (corded)', priceMultiplier: 5.0 },
            { name: 'Power Tool (cordless)', priceMultiplier: 8.0 },
            { name: 'Fasteners (box)', priceMultiplier: 0.3 },
        ],
        standardSizes: ['each', 'per box', 'per set'],
        priceRange: [15, 8000],
        defaultUnit: 'each',
        laborPerUnit: [0, 0],   // Tools don't have installation labour
        comparisonNote: 'Cordless tools are 2-3x the price of corded equivalents. Brand matters heavily for warranty.',
    },
];

// ─── Regional Price Adjustments ──────────────────────────────────────────

export interface RegionalAdjustment {
    region: string;
    label: string;
    /** Multiplier on base prices: 1.0 = baseline (Gauteng) */
    priceMultiplier: number;
    /** Typical transport/delivery surcharge */
    transportSurcharge: number;
    notes: string;
}

export const REGIONAL_ADJUSTMENTS: RegionalAdjustment[] = [
    { region: 'gauteng', label: 'Gauteng (JHB/PTA)', priceMultiplier: 1.0, transportSurcharge: 0, notes: 'Baseline pricing, most competitive market.' },
    { region: 'cape-town', label: 'Western Cape (CPT)', priceMultiplier: 1.03, transportSurcharge: 50, notes: 'Slightly higher due to transport from inland manufacturers.' },
    { region: 'durban', label: 'KwaZulu-Natal (DBN)', priceMultiplier: 1.02, transportSurcharge: 30, notes: 'Port-adjacent, some imports cheaper but inland materials slightly more.' },
];

// ─── Helper: Get knowledge for a product ──────────────────────────────────

export function findProductKnowledge(query: string): ProductKnowledge | null {
    const q = query.toLowerCase();
    for (const pk of SA_PRODUCT_KNOWLEDGE) {
        if (pk.aliases.some(alias => q.includes(alias))) return pk;
    }
    return null;
}

export function findStoreProfile(storeId: string): StoreProfile | undefined {
    return SA_STORES.find(s => s.id === storeId);
}

export function getRegionalAdjustment(region: string): RegionalAdjustment {
    return REGIONAL_ADJUSTMENTS.find(r => r.region === region) || REGIONAL_ADJUSTMENTS[0];
}
