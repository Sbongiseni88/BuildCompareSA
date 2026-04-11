import {
    Project,
    Supplier,
    ComparisonResult,
    Material,
    ChatMessage,
    DashboardStats,
    Notification,
    PriceQuote
} from '@/types';

// Mock Suppliers with FULL ADDRESS DETAILS
export const mockSuppliers: Supplier[] = [
    {
        id: 'builders-sandton',
        name: 'Builders Warehouse',
        logo: '/suppliers/builders.svg',
        type: 'chain',
        rating: 4.5,
        deliveryTime: '2-3 days',
        address: '123 Rivonia Road, Sandton City',
        city: 'Sandton',
        province: 'Gauteng',
        phone: '011 783 4500',
    },
    {
        id: 'builders-fourways',
        name: 'Builders Warehouse',
        logo: '/suppliers/builders.svg',
        type: 'chain',
        rating: 4.4,
        deliveryTime: '2-3 days',
        address: 'Fourways Mall, William Nicol Drive',
        city: 'Fourways',
        province: 'Gauteng',
        phone: '011 465 8900',
    },
    {
        id: 'leroy-midrand',
        name: 'Leroy Merlin',
        logo: '/suppliers/leroy.svg',
        type: 'chain',
        rating: 4.3,
        deliveryTime: '3-5 days',
        address: 'Mall of Africa, Lone Creek Crescent',
        city: 'Midrand',
        province: 'Gauteng',
        phone: '010 634 2000',
    },
    {
        id: 'leroy-greenstone',
        name: 'Leroy Merlin',
        logo: '/suppliers/leroy.svg',
        type: 'chain',
        rating: 4.2,
        deliveryTime: '3-5 days',
        address: 'Greenstone Shopping Centre, Modderfontein',
        city: 'Edenvale',
        province: 'Gauteng',
        phone: '010 634 3000',
    },
    {
        id: 'cashbuild-midrand',
        name: 'Cashbuild',
        logo: '/suppliers/cashbuild.svg',
        type: 'chain',
        rating: 4.2,
        deliveryTime: '2-4 days',
        address: '45 Old Pretoria Road, Halfway House',
        city: 'Midrand',
        province: 'Gauteng',
        phone: '011 315 2800',
    },
    {
        id: 'cashbuild-roodepoort',
        name: 'Cashbuild',
        logo: '/suppliers/cashbuild.svg',
        type: 'chain',
        rating: 4.0,
        deliveryTime: '2-4 days',
        address: '289 Ontdekkers Road, Florida',
        city: 'Roodepoort',
        province: 'Gauteng',
        phone: '011 472 1500',
    },
    {
        id: 'mica-randburg',
        name: 'Mica Hardware',
        logo: '/suppliers/mica.svg',
        type: 'chain',
        rating: 4.1,
        deliveryTime: '3-5 days',
        address: '55 Hill Street, Ferndale',
        city: 'Randburg',
        province: 'Gauteng',
        phone: '011 789 3000',
    },
    {
        id: 'local-jhb-supplies',
        name: 'JHB Building Supplies',
        logo: '/suppliers/local.svg',
        type: 'independent',
        rating: 4.6,
        deliveryTime: '1-2 days',
        address: '78 Main Reef Road, Booysens',
        city: 'Johannesburg South',
        province: 'Gauteng',
        phone: '011 493 2100',
    },
    {
        id: 'local-pretoria',
        name: 'Pretoria Builders Yard',
        logo: '/suppliers/local.svg',
        type: 'independent',
        rating: 4.4,
        deliveryTime: '1-2 days',
        address: '234 Church Street East, Arcadia',
        city: 'Pretoria',
        province: 'Gauteng',
        phone: '012 342 5600',
    },
    {
        id: 'local-capetown',
        name: 'Cape Town Materials Co.',
        logo: '/suppliers/local.svg',
        type: 'independent',
        rating: 4.4,
        deliveryTime: '1-2 days',
        address: '89 Voortrekker Road, Bellville',
        city: 'Cape Town',
        province: 'Western Cape',
    },
    {
        id: 'contractor-jhb',
        name: 'Sipho & Sons Construction',
        logo: '/suppliers/contractor.svg',
        type: 'contractor',
        rating: 4.8,
        deliveryTime: 'Available Next Week',
        address: '15 M1 Rd, Alexandra',
        city: 'Johannesburg',
        province: 'Gauteng',
        phone: '082 123 4567',
    },
    {
        id: 'contractor-pta',
        name: 'Gauteng Master Builders',
        logo: '/suppliers/contractor.svg',
        type: 'contractor',
        rating: 4.5,
        deliveryTime: 'Available in 3 Days',
        address: '88 Church St, Pretoria',
        city: 'Pretoria',
        province: 'Gauteng',
        phone: '083 987 6543',
    },
    {
        id: 'contractor-cpt',
        name: 'Cape Trade Pros',
        logo: '/suppliers/contractor.svg',
        type: 'contractor',
        rating: 4.9,
        deliveryTime: 'Available Tomorrow',
        address: '12 Main Rd, Bellville',
        city: 'Cape Town',
        province: 'Western Cape',
        phone: '021 555 1234',
    },
    {
        id: 'contractor-wc',
        name: 'Stellenbosch Build Co.',
        logo: '/suppliers/contractor.svg',
        type: 'contractor',
        rating: 4.6,
        deliveryTime: 'Available Next Week',
        address: '4 Dorp St, Stellenbosch',
        city: 'Stellenbosch',
        province: 'Western Cape',
        phone: '021 888 1234',
    },
    {
        id: 'contractor-dbn',
        name: 'KZN Master Builders',
        logo: '/suppliers/contractor.svg',
        type: 'contractor',
        rating: 4.7,
        deliveryTime: 'Available in 2 Days',
        address: '45 Umhlanga Rocks Dr',
        city: 'Durban',
        province: 'KwaZulu-Natal',
        phone: '031 123 4567',
    },
    {
        id: 'contractor-pmb',
        name: 'Natal Artisan Group',
        logo: '/suppliers/contractor.svg',
        type: 'contractor',
        rating: 4.4,
        deliveryTime: 'Available Tomorrow',
        address: '10 Chief Albert Luthuli St',
        city: 'Pietermaritzburg',
        province: 'KwaZulu-Natal',
        phone: '033 987 6543',
    }
];

// Mock Projects
export const mockProjects: Project[] = [
    {
        id: 'proj-1',
        name: 'Sandton Mall Renovation',
        location: 'Sandton, Gauteng',
        createdAt: new Date('2024-01-15'),
        totalBudget: 2500000,
        spent: 1875000,
        status: 'active',
        materials: [
            { id: 'mat-1', name: 'AfriSam Portland Cement 50kg', brand: 'AfriSam', category: 'cement', quantity: 500, unit: 'bags' },
            { id: 'mat-2', name: 'Corobrik Clay Face Brick (NFP)', brand: 'Corobrik', category: 'bricks', quantity: 15000, unit: 'units' },
            { id: 'mat-3', name: 'ArcelorMittal Y10 Steel Rebar', brand: 'ArcelorMittal', category: 'steel', quantity: 200, unit: 'bars' },
        ],
    },
    {
        id: 'proj-2',
        name: 'Waterfall Estate Houses',
        location: 'Midrand, Gauteng',
        createdAt: new Date('2024-02-20'),
        totalBudget: 8500000,
        spent: 3200000,
        status: 'active',
        materials: [
            { id: 'mat-4', name: 'Lafarge Ready-Mix Concrete', brand: 'Lafarge', category: 'cement', quantity: 100, unit: 'm³' },
            { id: 'mat-5', name: 'Merensky Meranti Timber 38x114', brand: 'Merensky', category: 'timber', quantity: 800, unit: 'lengths' },
        ],
    },
    {
        id: 'proj-3',
        name: 'Durban Beachfront Complex',
        location: 'Umhlanga, KZN',
        createdAt: new Date('2024-03-10'),
        totalBudget: 15000000,
        spent: 4500000,
        status: 'active',
        materials: [],
    },
    {
        id: 'proj-4',
        name: 'Cape Town Office Park',
        location: 'Century City, WC',
        createdAt: new Date('2023-11-05'),
        totalBudget: 5000000,
        spent: 5000000,
        status: 'completed',
        materials: [],
    },
];

// Mock Materials for search - WITH BRAND NAMES
export const mockMaterials: Material[] = [
    // Cement
    { id: 'cem-1', name: 'AfriSam All Purpose Cement 50kg (CEM II)', brand: 'AfriSam', category: 'cement', quantity: 1, unit: 'bag' },
    { id: 'cem-2', name: 'PPC Surebuild Cement 50kg', brand: 'PPC', category: 'cement', quantity: 1, unit: 'bag' },
    { id: 'cem-3', name: 'Lafarge Rapid Set Cement 25kg', brand: 'Lafarge', category: 'cement', quantity: 1, unit: 'bag' },
    { id: 'cem-4', name: 'Sephaku White Cement 50kg', brand: 'Sephaku', category: 'cement', quantity: 1, unit: 'bag' },
    { id: 'cem-5', name: 'AfriSam Roadstab Cement 50kg', brand: 'AfriSam', category: 'cement', quantity: 1, unit: 'bag' },

    // Bricks
    { id: 'brk-1', name: 'Corobrik Clay Face Brick (NFP)', brand: 'Corobrik', category: 'bricks', quantity: 1, unit: 'unit' },
    { id: 'brk-2', name: 'Corobrik Satin Face Brick', brand: 'Corobrik', category: 'bricks', quantity: 1, unit: 'unit' },
    { id: 'brk-3', name: 'Everite Cement Stock Brick', brand: 'Everite', category: 'bricks', quantity: 1, unit: 'unit' },
    { id: 'brk-4', name: 'Technicrete Maxi Brick (90mm)', brand: 'Technicrete', category: 'bricks', quantity: 1, unit: 'unit' },
    { id: 'brk-5', name: 'Boral Paving Brick', brand: 'Boral', category: 'bricks', quantity: 1, unit: 'unit' },

    // Steel
    { id: 'stl-1', name: 'ArcelorMittal Steel Rebar Y10 (6m)', brand: 'ArcelorMittal', category: 'steel', quantity: 1, unit: 'bar' },
    { id: 'stl-2', name: 'ArcelorMittal Steel Rebar Y12 (6m)', brand: 'ArcelorMittal', category: 'steel', quantity: 1, unit: 'bar' },
    { id: 'stl-3', name: 'ArcelorMittal Steel Rebar Y16 (6m)', brand: 'ArcelorMittal', category: 'steel', quantity: 1, unit: 'bar' },
    { id: 'stl-4', name: 'Macsteel Ref 193 Mesh (5.8m x 2.4m)', brand: 'Macsteel', category: 'steel', quantity: 1, unit: 'sheet' },
    { id: 'stl-5', name: 'Macsteel Ref 245 Mesh (5.8m x 2.4m)', brand: 'Macsteel', category: 'steel', quantity: 1, unit: 'sheet' },

    // Timber
    { id: 'tmb-1', name: 'Merensky Meranti 38x114mm (4.8m)', brand: 'Merensky', category: 'timber', quantity: 1, unit: 'length' },
    { id: 'tmb-2', name: 'Merensky Meranti 38x38mm (4.8m)', brand: 'Merensky', category: 'timber', quantity: 1, unit: 'length' },
    { id: 'tmb-3', name: 'York Timber SA Pine 38x38mm (3m)', brand: 'York Timber', category: 'timber', quantity: 1, unit: 'length' },
    { id: 'tmb-4', name: 'York Timber SA Pine 50x76mm (3m)', brand: 'York Timber', category: 'timber', quantity: 1, unit: 'length' },
    { id: 'tmb-5', name: 'TWK Treated Pine CCA (38x114mm)', brand: 'TWK', category: 'timber', quantity: 1, unit: 'length' },

    // Paint
    { id: 'pnt-1', name: 'Dulux Weatherguard Exterior 20L', brand: 'Dulux', category: 'paint', quantity: 1, unit: 'bucket' },
    { id: 'pnt-2', name: 'Dulux Supercover Interior 20L', brand: 'Dulux', category: 'paint', quantity: 1, unit: 'bucket' },
    { id: 'pnt-3', name: 'Plascon Double Velvet Interior 20L', brand: 'Plascon', category: 'paint', quantity: 1, unit: 'bucket' },
    { id: 'pnt-4', name: 'Plascon Micatex Exterior 20L', brand: 'Plascon', category: 'paint', quantity: 1, unit: 'bucket' },
    { id: 'pnt-5', name: 'Fired Earth Wall Paint 5L', brand: 'Fired Earth', category: 'paint', quantity: 1, unit: 'bucket' },
    { id: 'pnt-6', name: 'Duram Cement Primer 20L White', brand: 'Duram', category: 'paint', quantity: 1, unit: 'bucket' },

    // Roofing
    { id: 'rof-1', name: 'Makro IBR Roof Sheeting 0.47mm', brand: 'Makro', category: 'roofing', quantity: 1, unit: 'sheet' },
    { id: 'rof-2', name: 'Global Roofing Corrugated Sheet 0.5mm', brand: 'Global Roofing', category: 'roofing', quantity: 1, unit: 'sheet' },
    { id: 'rof-3', name: 'Marley Maxitile Roof Tile', brand: 'Marley', category: 'roofing', quantity: 1, unit: 'tile' },

    // Plumbing
    { id: 'plb-1', name: 'Marley 110mm PVC Pipe (6m)', brand: 'Marley', category: 'plumbing', quantity: 1, unit: 'length' },
    { id: 'plb-2', name: 'Marley 50mm PVC Pipe (6m)', brand: 'Marley', category: 'plumbing', quantity: 1, unit: 'length' },
    { id: 'plb-3', name: 'Geyserwise 150L Geyser', brand: 'Geyserwise', category: 'plumbing', quantity: 1, unit: 'unit' },

    // Hardware
    // Hardware & Tools
    { id: 'hwd-1', name: 'Hilti Expansion Bolt M10', brand: 'Hilti', category: 'hardware', quantity: 1, unit: 'box' },
    { id: 'hwd-2', name: 'Grip-Rite 75mm Nail Box (5kg)', brand: 'Grip-Rite', category: 'hardware', quantity: 1, unit: 'box' },
    { id: 'hwd-3', name: 'Stiletto 15oz Ti-Bone Hammer', brand: 'Stiletto', category: 'hardware', quantity: 1, unit: 'unit' },
    { id: 'hwd-4', name: 'Stanley FatMax Claw Hammer 20oz', brand: 'Stanley', category: 'hardware', quantity: 1, unit: 'unit' },
    { id: 'hwd-5', name: 'Makita 18V LXT Cordless Drill', brand: 'Makita', category: 'hardware', quantity: 1, unit: 'unit' },
    { id: 'hwd-6', name: 'Bosch Professional Angle Grinder', brand: 'Bosch', category: 'hardware', quantity: 1, unit: 'unit' },
    { id: 'hwd-7', name: 'Steel Wheelbarrow (Heavy Duty)', brand: 'Lasher', category: 'other', quantity: 1, unit: 'unit' },
];

// ============================================================
// DETERMINISTIC PRICE ENGINE — No more Math.random() chaos
// Each supplier has a fixed price multiplier so prices are
// consistent across page refreshes. This builds trust with
// testers who screenshot & share results.
// ============================================================

// Fixed supplier pricing profiles (multiplier relative to base)
const SUPPLIER_PRICE_PROFILES: Record<string, { multiplier: number; deliveryFee: number; stockChance: number; distance: Record<string, number> }> = {
    'builders-sandton': { multiplier: 1.08, deliveryFee: 350, stockChance: 0.95, distance: { gauteng: 8.2, 'cape-town': 0, durban: 0 } },
    'builders-fourways': { multiplier: 1.05, deliveryFee: 350, stockChance: 0.90, distance: { gauteng: 12.5, 'cape-town': 0, durban: 0 } },
    'leroy-midrand': { multiplier: 1.12, deliveryFee: 150, stockChance: 0.85, distance: { gauteng: 15.3, 'cape-town': 0, durban: 0 } },
    'leroy-greenstone': { multiplier: 1.10, deliveryFee: 150, stockChance: 0.88, distance: { gauteng: 18.7, 'cape-town': 0, durban: 0 } },
    'cashbuild-midrand': { multiplier: 0.95, deliveryFee: 0, stockChance: 0.92, distance: { gauteng: 10.1, 'cape-town': 0, durban: 0 } },
    'cashbuild-roodepoort': { multiplier: 0.93, deliveryFee: 0, stockChance: 0.80, distance: { gauteng: 22.4, 'cape-town': 0, durban: 0 } },
    'mica-randburg': { multiplier: 1.02, deliveryFee: 250, stockChance: 0.75, distance: { gauteng: 14.8, 'cape-town': 0, durban: 0 } },
    'local-jhb-supplies': { multiplier: 0.88, deliveryFee: 200, stockChance: 0.70, distance: { gauteng: 6.3, 'cape-town': 0, durban: 0 } },
    'local-pretoria': { multiplier: 0.90, deliveryFee: 180, stockChance: 0.78, distance: { gauteng: 45.2, 'cape-town': 0, durban: 0 } },
    'local-capetown': { multiplier: 0.92, deliveryFee: 200, stockChance: 0.82, distance: { gauteng: 0, 'cape-town': 9.5, durban: 0 } },
};

// Realistic SA base prices per category (Feb 2026 market rates)
function getBasePriceForCategory(category: string): number {
    const prices: Record<string, number> = {
        cement: 109,       // 50kg bag average
        bricks: 3.80,      // per brick
        steel: 165,         // Y10/Y12 rebar per bar
        timber: 89,         // per length
        plumbing: 220,      // average item
        electrical: 165,    // average item
        paint: 1650,        // 20L bucket average
        roofing: 285,       // per sheet/tile
        tiles: 42,          // per m²
        hardware: 250,       // per box/unit/tool average
        labor: 300,         // baseline fallback
        other: 95,
    };
    return prices[category] || 95;
}

// Deterministic hash for consistent "variety" without randomness
function stableHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// Generate mock price quotes with LOCATION DATA — DETERMINISTIC
export function generateMockQuotes(material: Material, region: string = 'gauteng'): PriceQuote[] {
    let basePrice = material._aiPriceEstimate || getBasePriceForCategory(material.category);
    
    // Dynamic Price Overrides based on Name Context (only apply if no AI override)
    const lowerName = material.name.toLowerCase();
    
    if (!material._aiPriceEstimate) {
        if (lowerName.includes('primer')) {
        basePrice = lowerName.includes('20l') ? 1150 : 350;
    } else if (lowerName.includes('weatherguard') || lowerName.includes('micatex')) {
        basePrice = 1899;
    } else if (lowerName.includes('supercover') || lowerName.includes('double velvet')) {
        basePrice = 1549;
    } else if (lowerName.includes('fired earth')) {
        basePrice = 689;
    } else if ((lowerName.includes('paint') || lowerName.includes('dulux') || lowerName.includes('plascon')) && lowerName.includes('20l')) {
        basePrice = 1750;
    } else if (lowerName.includes('cement') && lowerName.includes('white')) {
        basePrice = 185;
    } else if (lowerName.includes('cement') && lowerName.includes('rapid')) {
        basePrice = 135;
    } else if (lowerName.includes('sephaku') && lowerName.includes('42.5')) {
        basePrice = 114.95;
    } else if (lowerName.includes('cement') && !lowerName.includes('primer') && !lowerName.includes('brick')) {
        basePrice = 109;
    } else if (lowerName.includes('face brick') || lowerName.includes('satin')) {
        basePrice = 4.50;
    } else if (lowerName.includes('stock brick') || lowerName.includes('maxi brick')) {
        basePrice = 3.20;
    } else if (lowerName.includes('paving')) {
        basePrice = 5.80;
    } else if (lowerName.includes('y16')) {
        basePrice = 210;
    } else if (lowerName.includes('y12')) {
        basePrice = 175;
    } else if (lowerName.includes('y10')) {
        basePrice = 145;
    } else if (lowerName.includes('mesh') && lowerName.includes('245')) {
        basePrice = 1250;
    } else if (lowerName.includes('mesh') && lowerName.includes('193')) {
        basePrice = 980;
    } else if (lowerName.includes('geyser')) {
        basePrice = 4500;
    } else if (lowerName.includes('110mm')) {
        basePrice = 320;
    } else if (lowerName.includes('ibr') || lowerName.includes('corrugated')) {
        basePrice = 285;
    } else if (lowerName.includes('maxitile')) {
        basePrice = 42;
    }
    }
    
    // Dynamic Regional Labor Rates
    if (material.category === 'labor' && !material._aiPriceEstimate) {
        const isArtisan = lowerName.includes('artisan') || lowerName.includes('plumber') || lowerName.includes('electrician');
        if (region === 'gauteng') basePrice = isArtisan ? 750 : 300;
        else if (region === 'cape-town') basePrice = isArtisan ? 850 : 350;
        else if (region === 'durban') basePrice = isArtisan ? 600 : 250;
        else basePrice = isArtisan ? 700 : 300;
    }

    // Filter suppliers by region AND type
    const isLabor = material.category === 'labor';
    
    const regionSuppliers = mockSuppliers.filter(s => {
        if (isLabor && s.type !== 'contractor') return false;
        if (!isLabor && s.type === 'contractor') return false;

        if (region === 'gauteng') return s.province === 'Gauteng';
        if (region === 'cape-town') return s.province === 'Western Cape';
        if (region === 'durban') return s.province === 'KwaZulu-Natal';
        return true;
    });

    // Fallback to cross-region if not enough specific ones
    const suppliersToUse = regionSuppliers.length >= 1 ? regionSuppliers.slice(0, 6) : mockSuppliers.filter(s => isLabor ? s.type === 'contractor' : s.type !== 'contractor').slice(0, 6);

    return suppliersToUse.map((supplier, index) => {
        const profile = SUPPLIER_PRICE_PROFILES[supplier.id] || { multiplier: 1.0, deliveryFee: 250, stockChance: 0.85, distance: {} };

        // Deterministic small variance per material+supplier combo
        const hash = stableHash(`${material.id}-${supplier.id}`);
        const microVariance = ((hash % 100) - 50) / 1000; // ±5% deterministic wobble

        const price = Math.round(basePrice * (profile.multiplier + microVariance) * 100) / 100;

        // Deterministic discount (hash-based, not random)
        const hasDiscount = hash % 5 === 0; // ~20% of items on "sale"

        // Deterministic stock (based on hash, not random)
        const inStock = (hash % 10) < (profile.stockChance * 10);

        // Deterministic stock quantity
        const stockQuantity = 50 + (hash % 450);

        // Fixed distance per region
        const distance = profile.distance[region] || (5 + (hash % 250) / 10);

        return {
            supplierId: supplier.id,
            supplierName: supplier.name,
            supplierLogo: supplier.logo,
            supplierAddress: supplier.address || '',
            supplierCity: supplier.city || '',
            supplierProvince: supplier.province || '',
            supplierPhone: supplier.phone || '',
            supplierType: supplier.type,
            price: price,
            originalPrice: hasDiscount ? Math.round(price * 1.15 * 100) / 100 : undefined,
            inStock: isLabor ? true : inStock,
            stockQuantity: isLabor ? 1 : stockQuantity,
            deliveryFee: isLabor ? 0 : profile.deliveryFee,
            deliveryDays: isLabor ? 0 : index + 1,
            distance: distance,
            productUrl: getMockProductUrl(supplier.name, material.name),
            lastUpdated: new Date(),
        };
    });
}

function getMockProductUrl(supplierName: string, productName: string): string {
    const q = encodeURIComponent(productName);
    if (supplierName.toLowerCase().includes('builders')) {
        return `https://www.builders.co.za/search/?text=${q}`;
    } else if (supplierName.toLowerCase().includes('leroy')) {
        return `https://leroymerlin.co.za/catalogsearch/result/?q=${q}`;
    } else if (supplierName.toLowerCase().includes('cashbuild')) {
        return `https://www.cashbuild.co.za/search?q=${q}`;
    }
    return `https://www.google.com/search?q=${q}+price+at+${encodeURIComponent(supplierName)}`;
}

// Generate comparison results
export function generateComparisonResults(materials: Material[], region: string = 'gauteng'): ComparisonResult[] {
    return materials.map(material => {
        const quotes = generateMockQuotes(material, region);
        const prices = quotes.filter(q => q.inStock).map(q => q.price);
        const bestQuote = quotes.reduce((best, current) =>
            current.inStock && (!best || current.price < best.price) ? current : best
            , null as PriceQuote | null);

        const averagePrice = prices.length > 0
            ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
            : 0;

        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const potentialSavings = Math.round((maxPrice - minPrice) * material.quantity * 100) / 100;

        return {
            material,
            quotes,
            bestPrice: bestQuote,
            averagePrice,
            potentialSavings,
        };
    });
}

// Mock Dashboard Stats
export const mockDashboardStats: DashboardStats = {
    totalProjects: 12,
    activeProjects: 4,
    totalSavings: 485750,
    comparisonsToday: 23,
    averageSavingsPercent: 18.5,
};

// Mock Notifications
export const mockNotifications: Notification[] = [
    {
        id: 'notif-1',
        type: 'price-drop',
        title: 'Price Drop Alert!',
        message: 'AfriSam Portland Cement at Builders Sandton dropped by 12% - R109.99/bag',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
        id: 'notif-2',
        type: 'stock-alert',
        title: 'Low Stock Warning',
        message: 'ArcelorMittal Y10 Rebar running low at Cashbuild Midrand - Order soon!',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
        id: 'notif-3',
        type: 'delivery',
        title: 'Delivery Scheduled',
        message: 'Your order from Leroy Merlin Greenstone arrives tomorrow 9am-12pm',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    },
];

// Mock AI Chat Messages
export const mockChatMessages: ChatMessage[] = [
    {
        id: 'chat-1',
        role: 'assistant',
        content: "Sawubona! I'm your BuildCompare Concierge. Need help with a BoQ or estimating material for your next project?",
        timestamp: new Date(),
    },
];

// AI Response Generator - ENHANCED ACTION BOT
export function generateAIResponse(userMessage: string): ChatMessage {
    const lowerMessage = userMessage.toLowerCase();

    // 1. COMPLEX SCENARIO: Cement Types
    if (lowerMessage.includes('cement') && (lowerMessage.includes('need') || lowerMessage.includes('what'))) {
        return {
            id: `chat-${Date.now()}`,
            role: 'assistant',
            content: `Choosing the right cement depends entirely on what part of the building you are working on. In South Africa, cement is classified by its strength (measured in Megapascals or MPa), and for NHBRC-compliant residential builds, you typically choose between **32.5** and **42.5** grade.

Here is a breakdown based on your specific application:

### 1. For Foundations and Suspended Slabs (Structural)
*   **Recommendation:** **42.5N or 42.5R**
*   **Why:** For any structural element that carries the weight of the house, NHBRC standards generally require a higher strength. Using 42.5 ensures the concrete reaches its required strength (usually 25MPa to 30MPa) faster and more reliably.
*   **Application:** Footings, reinforced columns, beams, and structural floor slabs.

### 2. For Bricklaying and Plastering (Mortar)
*   **Recommendation:** **32.5N**
*   **Why:** 42.5 is often "too strong" for plaster and can lead to excessive shrinkage cracks. A 32.5 grade cement provides better workability (it's "fatter") and allows the mortar to bond well without becoming brittle.
*   **Application:** Building walls (mortar) and internal/external plastering.

### 3. For Surface Beds and Driveways (Non-Structural)
*   **Recommendation:** **32.5N or 42.5N**
*   **Why:** If it is a standard ground-level floor slab (surface bed) for a house, a 32.5 grade is often sufficient if mixed correctly. However, for driveways that will handle heavy vehicles, 42.5 is preferred to prevent cracking and wear.

### 4. Specialized Projects (Coastal or Wet Areas)
*   **Recommendation:** **Sulphate Resistant or Marine Grade Cement**
*   **Why:** If you are building right on the coast (e.g., KZN or Western Cape) or in areas with high water tables, you may need a cement that resists salt and chemical erosion.

---

### Important SA Standards Checklist:
*   **Look for the SABS Mark:** Ensure the bags carry the SANS 50197-1 mark. This is a non-negotiable for NHBRC inspections.
*   **Brand Reliability:** In SA, brands like **PPC, AfriSam, Sephaku, and Lafarge** are the industry standards.
*   **Shelf Life:** Never use cement that has "lumps" in it or has been sitting on a damp floor. Cement starts to lose its chemical strength 3 months after the packing date.

**What specific part of the project are you working on right now? I can give you the exact mixing ratios for that job.**`,
            timestamp: new Date()
        };
    }

    // 2. COMPLEX SCENARIO: 3 Bedroom House
    if (lowerMessage.includes('3 bedroom') || lowerMessage.includes('build a house') || lowerMessage.includes('house plan')) {
        return {
            id: `chat-${Date.now()}`,
            role: 'assistant',
            content: `To build a 3-bedroom, 2-bathroom house in South Africa that complies with **NHBRC (National Home Builders Registration Council)** standards and local municipal regulations, you need to plan across four main categories: Legal/Compliance, Professional Services, Structural Materials, and Finishes.

Here is a breakdown of what you will need:

### 1. Legal & Compliance (Non-Negotiables)
Before you lay a single brick, you must have these in place to ensure your home is legal and insurable:
*   **NHBRC Enrollment:** You must enroll the project with the NHBRC before construction begins. This protects you against structural defects.
*   **Approved Building Plans:** Designed by a SACAP-registered professional and approved by your local municipality.
*   **Water & Electrical Connections:** Applications for temporary (construction) and permanent meters from your local council.
*   **Insurance:** Contractors' All Risk insurance is highly recommended.

### 2. The Professional Team
South African law requires certain professionals to sign off on stages of the build:
*   **Architect/Senior Draughtsperson:** To design the layout and ensure SANS 10400 (building regulations) compliance.
*   **Structural Engineer:** To design the foundations, roof tie-downs, and any concrete slabs. They must issue a completion certificate (Form 4).
*   **NHBRC Registered Contractor:** To physically build the house.
*   **Land Surveyor:** To peg out the boundary lines accurately.

### 3. Structural Requirements (The Shell)
For a standard 3-bed, 2-bath house (approx. 100m² – 150m²), you will need:
*   **Foundations:** Concrete, reinforcing steel (rebar), and mesh.
*   **Walls:** SABS-approved cement blocks or clay bricks, plus **DPC (Damp Proof Course)** to prevent rising damp.
*   **Roofing:** Trusses (must be prefabricated and certified), roof covering (tiles or Chromadek), and an **A19 Roof Certificate** from an engineer.
*   **Windows & Doors:** Standard aluminium or timber frames. Glass must meet SANS safety regulations (especially in bathrooms).

### 4. Internal Services (Plumbing & Electrical)
*   **Plumbing:** 
    *   Piping for 2 bathrooms (showers, toilets, basins, baths) and 1 kitchen (sink, washing machine/dishwasher points).
    *   **Geyser:** By law (SANS 10400-XA), you must have an energy-efficient water heating system (Solar Geyser or Heat Pump).
*   **Electrical:** 
    *   DB board, wiring, plugs, and light points.
    *   You will need an **Electrical Certificate of Compliance (COC)** at the end.

### 5. Finishing Schedule
This is where you define the look of the home:
*   **Kitchen:** Floor units, wall units, countertops (granite, quartz, or laminate), sink, and oven/hob.
*   **Bathrooms:** 2x Toilets, 2x Basins, at least 1 shower, and 1 bath (standard layout).
*   **Flooring:** Tiles, laminate, or vinyl for the whole house.
*   **Ceilings:** Rhinoboard or PVC ceilings with cornices.
*   **Paint:** Undercoat and final coats for interior and exterior.

### 6. Budgeting Tip (The BuildCompare Way)
In the South African market, building costs currently range from **R8,000 to R12,000 per square meter** for a standard finish. 
*   **Estimate:** For a modest 120m² 3-bedroom house, you should budget between **R960,000 and R1.4 million**, depending on your choice of finishes and the slope of your land.

**Would you like me to help you estimate the specific quantities of bricks and cement for this layout?**`,
            timestamp: new Date()
        };
    }

    // 3. Handle "Price Trend" Queries
    if (lowerMessage.includes('trend') || lowerMessage.includes('forecast') || lowerMessage.includes('buy now')) {
        const product = lowerMessage.includes('copper') ? 'Copper Piping' :
            lowerMessage.includes('steel') ? 'Steel Rebar' :
                lowerMessage.includes('cement') ? 'Cement' : 'Building Materials';

        const advice = lowerMessage.includes('copper') || lowerMessage.includes('steel')
            ? "📉 **Buy Now** - Prices are trending down"
            : "📈 **Wait** - Prices expected to drop next month";

        return {
            id: `chat-${Date.now()}`,
            role: 'assistant',
            content: `### 📊 Price Trend Analysis: ${product}\n\n${advice}\n\n**Historical Data (3 Months):**\n• Current: R${Math.floor(Math.random() * 100) + 100}\n• Last Month: R${Math.floor(Math.random() * 100) + 110}\n• 3 Months Ago: R${Math.floor(Math.random() * 100) + 120}\n\n**Recommendation:** Based on global commodities data, supply is increasing. We predict a further **3-5% drop** in the next 14 days.`,
            timestamp: new Date()
        };
    }

    // 4. General Keyword Responses (Fallback)
    const responses = [
        {
            keywords: ['brick', 'bricks', 'face brick', 'stock brick'],
            response: "I see you need bricks! Here's what I found:\n\n🧱 **Corobrik NFP Clay Face Brick**: R3.20 - R4.50 each\n🧱 **Corobrik Satin Face Brick**: R4.80 - R5.50 each\n\nFor a 10m² wall, you'll need approximately **600 bricks**.",
        },
        {
            keywords: ['paint', 'painting'],
            response: "Here are the current paint prices:\n\n🎨 **Dulux Weatherguard Exterior 20L**: R1,850 - R2,100\n🎨 **Plascon Micatex Exterior 20L**: R1,650 - R1,890\n\nSale Alert: Leroy Merlin has 15% off Dulux this week!",
        }
    ];

    for (const resp of responses) {
        if (resp.keywords.some(keyword => lowerMessage.includes(keyword))) {
            return {
                id: `chat-${Date.now()}`,
                role: 'assistant',
                content: resp.response,
                timestamp: new Date(),
            };
        }
    }

    // Default response
    return {
        id: `chat-${Date.now()}`,
        role: 'assistant',
        content: `👋 Sawubona! I'm your **BuildCompare Concierge**. Need help with a BoQ or estimating material for your next project?\n\nI can help you:\n• **Find Stock**: "Find 5000 bricks near me"\n• **Technical Advice**: "What cement do I need for a foundation?"\n• **Project Planning**: "What do I need for a 3 bedroom house?"\n\nWhat do you need handled right now?`,
        timestamp: new Date(),
    };
}

// Simulate OCR/Image Analysis - DYNAMIC RANDOMIZATION
export function analyzeUploadedImage(fileName: string): Material[] {
    const listA: Material[] = [
        { id: `dyn-${Date.now()}-1`, name: 'PPC Surebuild Cement 50kg', brand: 'PPC', category: 'cement', quantity: 60, unit: 'bags' },
        { id: `dyn-${Date.now()}-2`, name: 'Corobrik Satin Face Brick', brand: 'Corobrik', category: 'bricks', quantity: 5000, unit: 'units' },
        { id: `dyn-${Date.now()}-3`, name: 'Building Sand ( Bulk )', brand: 'Generic', category: 'other', quantity: 6, unit: 'm³' }
    ];

    const listB: Material[] = [
        { id: `dyn-${Date.now()}-4`, name: 'AfriSam All Purpose Cement', brand: 'AfriSam', category: 'cement', quantity: 20, unit: 'bags' },
        { id: `dyn-${Date.now()}-5`, name: 'Macsteel Ref 193 Mesh', brand: 'Macsteel', category: 'steel', quantity: 15, unit: 'sheets' },
        { id: `dyn-${Date.now()}-6`, name: 'Y12 Steel Rebar (6m)', brand: 'ArcelorMittal', category: 'steel', quantity: 30, unit: 'bars' }
    ];

    const listC: Material[] = [
        { id: `dyn-${Date.now()}-7`, name: 'Dulux Weatherguard 20L', brand: 'Dulux', category: 'paint', quantity: 5, unit: 'buckets' },
        { id: `dyn-${Date.now()}-8`, name: 'Paint Roller Set', brand: 'Academy', category: 'other', quantity: 3, unit: 'sets' },
        { id: `dyn-${Date.now()}-9`, name: 'Polyfilla Exterior 2kg', brand: 'Polycell', category: 'other', quantity: 10, unit: 'boxes' }
    ];

    // If filename has clues, be specific, else VALID random choice
    const lowerName = fileName.toLowerCase();

    if (lowerName.includes('paint') || lowerName.includes('decor')) return listC;
    if (lowerName.includes('structure') || lowerName.includes('slab')) return listB;
    if (lowerName.includes('wall') || lowerName.includes('brick')) return listA;

    // Pick a random list if no match
    const lists = [listA, listB, listC];
    return lists[Math.floor(Math.random() * lists.length)];
}
