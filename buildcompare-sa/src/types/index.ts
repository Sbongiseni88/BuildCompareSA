// Project Types
export interface Project {
    id: string;
    name: string;
    location: string;
    createdAt: Date;
    totalBudget: number;
    spent: number;
    status: 'active' | 'completed' | 'on-hold';
    materials: Material[];
}

// Material Types - NOW WITH BRAND
export interface Material {
    id: string;
    name: string;
    brand?: string;
    category: MaterialCategory;
    quantity: number;
    unit: string;
    imageUrl?: string;
}

export type MaterialCategory =
    | 'cement'
    | 'bricks'
    | 'steel'
    | 'timber'
    | 'plumbing'
    | 'electrical'
    | 'paint'
    | 'roofing'
    | 'tiles'
    | 'hardware'
    | 'labor'
    | 'other';

// Supplier Types - NOW WITH FULL ADDRESS
export interface Supplier {
    id: string;
    name: string;
    logo: string;
    type: 'chain' | 'independent';
    rating: number;
    deliveryTime: string;
    address?: string;
    city?: string;
    province?: string;
    phone?: string;
}

// Price Comparison Types - NOW WITH LOCATION
export interface PriceQuote {
    supplierId: string;
    supplierName: string;
    supplierLogo: string;
    supplierAddress?: string;
    supplierCity?: string;
    supplierProvince?: string;
    supplierPhone?: string;
    price: number;
    originalPrice?: number;
    inStock: boolean;
    stockQuantity?: number;
    deliveryFee: number;
    deliveryDays: number;
    distance: number;
    lastUpdated: Date;
}

export interface ComparisonResult {
    material: Material;
    quotes: PriceQuote[];
    bestPrice: PriceQuote | null;
    averagePrice: number;
    potentialSavings: number;
}

// Search Types
export interface SearchParams {
    query?: string;
    category?: MaterialCategory;
    region: Region;
    radius: number;
    sortBy: 'price' | 'distance' | 'rating' | 'delivery';
}

export type Region = 'gauteng' | 'cape-town' | 'durban' | 'all';

// Upload Types
export interface UploadedFile {
    id: string;
    name: string;
    type: 'image' | 'document';
    url: string;
    processedAt?: Date;
    extractedMaterials?: Material[];
    aiSuggestions?: AISuggestion[];
}

// AI Concierge Types
export interface AISuggestion {
    id: string;
    type: 'quantity' | 'alternative' | 'tip' | 'warning';
    message: string;
    confidence: number;
    relatedMaterial?: Material;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    suggestions?: AISuggestion[];
}

// Dashboard Stats Types
export interface DashboardStats {
    totalProjects: number;
    activeProjects: number;
    totalSavings: number;
    comparisonsToday: number;
    averageSavingsPercent: number;
}

// Notification Types
export interface Notification {
    id: string;
    type: 'price-drop' | 'stock-alert' | 'delivery' | 'system';
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
}
