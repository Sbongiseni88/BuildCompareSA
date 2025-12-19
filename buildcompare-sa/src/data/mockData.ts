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
        phone: '021 948 3200',
    },
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
    { name: 'Hilti Expansion Bolt M10', id: 'hwd-1', brand: 'Eda', category: 'hardware', quantity: 1, unit: 'box' },
    { id: 'hwd-2', name: 'Grip-Rite 75mm Nail Box (5kg)', brand: 'Grip-Rite', category: 'hardware', quantity: 1, unit: 'box' },
];

// Generate mock price quotes with LOCATION DATA
export function generateMockQuotes(material: Material, region: string = 'gauteng'): PriceQuote[] {
    let basePrice = getBasePriceForCategory(material.category);

    // Dynamic Price Overrides based on Name Context
    const lowerName = material.name.toLowerCase();

    if (lowerName.includes('primer')) {
        basePrice = lowerName.includes('20l') ? 1150 : 350; // 20L Primer vs 5L
    } else if (lowerName.includes('paint') || lowerName.includes('dulux') || lowerName.includes('plascon')) {
        basePrice = lowerName.includes('20l') ? 1600 : 450;
    } else if (lowerName.includes('cement') && !lowerName.includes('primer')) {
        basePrice = 110; // Standard Cement bag
    } else if (lowerName.includes('brick')) {
        basePrice = 3.5;
    }

    // Filter suppliers by region
    const regionSuppliers = mockSuppliers.filter(s => {
        if (region === 'gauteng') return s.province === 'Gauteng';
        if (region === 'cape-town') return s.province === 'Western Cape';
        if (region === 'durban') return s.province === 'KwaZulu-Natal';
        return true;
    });

    const suppliersToUse = regionSuppliers.length >= 4 ? regionSuppliers.slice(0, 5) : mockSuppliers.slice(0, 5);

    return suppliersToUse.map((supplier, index) => {
        const variance = (Math.random() - 0.5) * 0.3; // ±15% variance
        const price = Math.round(basePrice * (1 + variance) * 100) / 100;
        const hasDiscount = Math.random() > 0.7;

        return {
            supplierId: supplier.id,
            supplierName: supplier.name,
            supplierLogo: supplier.logo,
            supplierAddress: supplier.address || '',
            supplierCity: supplier.city || '',
            supplierProvince: supplier.province || '',
            supplierPhone: supplier.phone || '',
            price: price,
            originalPrice: hasDiscount ? Math.round(price * 1.15 * 100) / 100 : undefined,
            inStock: Math.random() > 0.2,
            stockQuantity: Math.floor(Math.random() * 500) + 50,
            deliveryFee: supplier.type === 'chain' ? 350 : 200 + Math.floor(Math.random() * 150),
            deliveryDays: index + 1,
            distance: Math.round((5 + Math.random() * 25) * 10) / 10,
            lastUpdated: new Date(),
        };
    });
}
function getBasePriceForCategory(category: string): number {
    const prices: Record<string, number> = {
        cement: 125,
        bricks: 3.50,
        steel: 185,
        timber: 95,
        plumbing: 250,
        electrical: 180,
        paint: 850,
        roofing: 320,
        tiles: 45,
        hardware: 75,
        other: 100,
    };
    return prices[category] || 100;
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
        content: "👋 Welcome to BuildCompare AI! I'm your **Action Bot** 🤖. Ask me to find stock, check prices, or analyze market trends.",
        timestamp: new Date(),
    },
];

// AI Response Generator - ENHANCED ACTION BOT
export function generateAIResponse(userMessage: string): ChatMessage {
    const lowerMessage = userMessage.toLowerCase();

    // 1. Handle "Price Trend" Queries
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

    // 2. Handle "Stock" & "Location" Queries (e.g. "5000 bricks within 20km")
    if (lowerMessage.includes('stock') || lowerMessage.includes('km') || lowerMessage.includes('open') || lowerMessage.includes('find')) {
        // Extract numbers if present
        const quantityMatch = userMessage.match(/(\d+)\s*(stock|bricks|bags|units)/i);
        const quantity = quantityMatch ? quantityMatch[1] : "required quantity";

        return {
            id: `chat-${Date.now()}`,
            role: 'assistant',
            content: `### 📍 Local Stock Locator\n\nSearching for **${quantity}** items within **20km**...\n\nFound **3 suppliers** open right now:\n\n1. **Builders Warehouse Sandton** (3.2km)\n   🟢 **${Math.floor(Math.random() * 5000) + 2000} in stock**\n   🕒 Closes 18:00\n   💰 R${(Math.random() * 10 + 2).toFixed(2)}/unit\n\n2. **JHB Building Supplies** (8.5km)\n   🟢 **${Math.floor(Math.random() * 8000) + 1000} in stock**\n   🕒 Closes 17:30\n   💰 R${(Math.random() * 10 + 1.8).toFixed(2)}/unit\n\n3. **Leroy Merlin** (12km)\n   🟡 **Low Stock (Call to reserve)**\n   🕒 Closes 19:00\n\n[🗺️ View on Map](#) | [📞 Call Best Price](#)`,
            timestamp: new Date()
        };
    }

    // 3. Specific Product Handling (Priority over generic keywords)
    if (lowerMessage.includes('primer')) {
        return {
            id: `chat-${Date.now()}`,
            role: 'assistant',
            content: `### 🎨 Paint Primer Search\n\nI found **Duram Cement Primer 20L White** at these top locations:\n\n1. **Leroy Merlin**: R1,299.00\n   ✅ In Stock\n2. **Builders Warehouse**: R1,350.00\n3. **Mica Hardware**: R1,420.00\n\n**Quantity Check:** For coverage, 20L typically covers **100-120m²** depending on surface porosity.\n\nWould you like me to add this to your comparison list?`,
            timestamp: new Date()
        };
    }

    // 4. General Keyword Responses
    const responses = [
        {
            keywords: ['cement', 'concrete', 'mix'],
            // Only match if 'primer' wasn't caught above
            response: "I can see you're looking for cement/concrete products. Based on current market rates in Gauteng:\n\n🏗️ **AfriSam All Purpose Cement 50kg**: R109 - R135 per bag\n🏗️ **PPC Surebuild Cement 50kg**: R115 - R142 per bag\n\nFor a standard wall (3m x 2.4m), you'll need approximately **8-10 bags**.",
        },
        {
            keywords: ['brick', 'bricks', 'face brick', 'stock brick'],
            response: "I see you need bricks! Here's what I found:\n\n🧱 **Corobrik NFP Clay Face Brick**: R3.20 - R4.50 each\n🧱 **Corobrik Satin Face Brick**: R4.80 - R5.50 each\n\nFor a 10m² wall, you'll need approximately **600 bricks**.",
        },
        {
            keywords: ['steel', 'rebar', 'reinforcing', 'mesh'],
            response: "Looking at steel reinforcement options:\n\n🔩 **ArcelorMittal Y10 Rebar (6m)**: R165 - R195 per bar\n🔩 **Macsteel Ref 193 Mesh**: R890 - R1,050 per sheet\n\nSteel prices have been stable this month.",
        },
        {
            keywords: ['paint', 'painting', 'weatherguard', 'plascon', 'dulux'],
            response: "Here are the current paint prices:\n\n🎨 **Dulux Weatherguard Exterior 20L**: R1,850 - R2,100\n🎨 **Plascon Micatex Exterior 20L**: R1,650 - R1,890\n\nSale Alert: Leroy Merlin has 15% off Dulux this week!",
        },
        {
            keywords: ['timber', 'wood', 'meranti', 'pine'],
            response: "Timber pricing update:\n\n🪵 **Merensky Meranti 38x114mm**: R85 - R105\n🪵 **York Timber SA Pine**: R28 - R38\n\nCurrent supply is good.",
        },
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
        content: `I'm your **BuildCompare Action Bot** 🤖\n\nI can help you:\n• **Find Stock**: "Find 5000 bricks near me"\n• **Check Availability**: "Is Builders Sandton open?"\n• **Analyze Trends**: "Should I buy copper now?"\n• **Compare Prices**: "Best price on Duram Primer"\n\nWhat do you need handled right now?`,
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
