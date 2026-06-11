import type { BoqCategory } from '@/lib/bccei/labour-defaults';

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
    /**
     * Canonical BCCEI tender category (one of the 8 engineering categories).
     * Populated by the BoQ pipeline; preferred over the legacy `category`
     * by the sourcing-file exporter and the BCCEI labour estimator.
     */
    tenderCategory?: BoqCategory;
    quantity: number;
    unit: string;
    imageUrl?: string;
    _aiPriceEstimate?: number;
    search_string?: string;
    laborCostEstimate?: number;
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
    type: 'chain' | 'independent' | 'contractor';
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
    supplierType?: 'chain' | 'independent' | 'contractor';
    price: number;
    originalPrice?: number;
    inStock: boolean;
    stockQuantity?: number;
    deliveryFee: number;
    deliveryDays: number;
    distance: number;
    productUrl?: string;
    isFallback?: boolean;
    laborCostEstimate?: number;
    priceConfidence?: 'high' | 'medium' | 'low';
    lastUpdated: Date;
    /** Landed Site Cost (shelf total + delivery estimate), ZAR — see src/lib/landed-cost.ts. */
    landedSiteCostZar?: number;
    /** Transport estimate component of the landed cost, ZAR. */
    landedDeliveryZar?: number;
    /** Audit trace for the landed figure ("Landed estimate: shelf … + transport …"). */
    landedBasis?: string;
}

export interface ComparisonResult {
    material: Material;
    quotes: PriceQuote[];
    bestPrice: PriceQuote | null;
    averagePrice: number;
    potentialSavings: number;
    isLive?: boolean;
    marketInsight?: string;
    comparisonNote?: string;
    /** Industry-standard BoQ category (Masonry, Concrete, Electrical, …) classified from the description. */
    tenderCategory?: string;
    /**
     * B2B site-operational service estimate for Preliminaries lines
     * (mirrors BatchPriceResult.pgService). Indicative service rate with an
     * audit basis — never a retail price.
     */
    pgService?: {
        serviceId: string;
        label: string;
        unit: string;
        rateZar: number;
        qty: number;
        totalZar: number;
        basis: string;
    } | null;
    /**
     * Single indicative mid-market estimate (ZAR/unit) when no store-verified
     * price exists. Never a per-store spread — supplier columns stay N/A.
     */
    indicativeEstimateZar?: number | null;
    /** Audit trace for the indicative estimate's origin. */
    estimateBasis?: string;
}

// Search Types
export interface SearchParams {
    query?: string;
    category?: MaterialCategory;
    lat?: number;
    lng?: number;
    radius: number;
    sortBy: 'price' | 'distance' | 'rating' | 'delivery';
}

/** @deprecated kept for backward compat — new code should use lat/lng */
export type Region = string;

// Upload Types
export interface UploadedFile {
    id: string;
    name: string;
    type: 'image' | 'document';
    url: string;
    processedAt?: Date;
    extractedMaterials?: Material[];
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
