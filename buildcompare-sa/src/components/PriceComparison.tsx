"use client";

import React, { useState, useEffect } from 'react';
import {
    Search,
    MapPin,
    TrendingDown,
    Truck,
    Star,
    ShoppingCart,
    ChevronDown,
    Check,
    Building2,
    Store,
    Package,
    Loader2,
    Filter,
    AlertCircle,
    Phone,
    Tag,
    Navigation
} from 'lucide-react';
import { Material, ComparisonResult, Region } from '@/types';
import { mockMaterials, generateComparisonResults } from '@/data/mockData';

interface PriceComparisonProps {
    initialMaterials?: Material[];
}

export default function PriceComparison({ initialMaterials = [] }: PriceComparisonProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMaterials, setSelectedMaterials] = useState<Material[]>(initialMaterials);
    const [region, setRegion] = useState<Region>('gauteng');
    const [radius, setRadius] = useState(20); // Default 20km as requested
    const [sortBy, setSortBy] = useState<'price' | 'distance' | 'rating'>('price');
    const [showFilters, setShowFilters] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchSuggestions, setSearchSuggestions] = useState<Material[]>([]);
    const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [quantityInputs, setQuantityInputs] = useState<Record<string, number>>({});

    const regions = [
        { id: 'gauteng', label: 'Gauteng', cities: 'JHB, PTA, Midrand' },
        { id: 'cape-town', label: 'Cape Town', cities: 'CBD, Century City' },
        { id: 'durban', label: 'Durban', cities: 'Umhlanga, Pinetown' },
    ];

    // Update results when initialMaterials change
    useEffect(() => {
        if (initialMaterials.length > 0) {
            setSelectedMaterials(initialMaterials);
            performSearch(initialMaterials);
        }
    }, [initialMaterials]);

    // Handle search input
    useEffect(() => {
        if (searchQuery.length > 1) {
            const filtered = mockMaterials.filter(m =>
                m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.brand && m.brand.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            setSearchSuggestions(filtered.slice(0, 8));
            setShowSuggestions(true);
        } else {
            setSearchSuggestions([]);
            setShowSuggestions(false);
        }
    }, [searchQuery]);

    const performSearch = async (materials: Material[]) => {
        setIsSearching(true);

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const results = generateComparisonResults(materials, region);
        setComparisonResults(results);
        setIsSearching(false);
    };

    const handleAddMaterial = (material: Material) => {
        const quantity = quantityInputs[material.id] || 1;
        const materialWithQty = { ...material, quantity };

        if (!selectedMaterials.find(m => m.id === material.id)) {
            const updated = [...selectedMaterials, materialWithQty];
            setSelectedMaterials(updated);
        }
        setSearchQuery('');
        setShowSuggestions(false);
        setQuantityInputs({});
    };

    const handleRemoveMaterial = (id: string) => {
        setSelectedMaterials(selectedMaterials.filter(m => m.id !== id));
        setComparisonResults(comparisonResults.filter(r => r.material.id !== id));
    };

    const handleSearch = () => {
        if (selectedMaterials.length > 0) {
            performSearch(selectedMaterials);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR',
            minimumFractionDigits: 2,
        }).format(value);
    };

    const totalSavings = comparisonResults.reduce((acc, r) => acc + r.potentialSavings, 0);

    // Popular categories for quick access
    const categories = [
        { name: 'Cement', query: 'cement' },
        { name: 'Bricks', query: 'brick' },
        { name: 'Steel', query: 'steel' },
        { name: 'Timber', query: 'timber' },
        { name: 'Paint', query: 'paint' },
        { name: 'Roofing', query: 'roof' },
    ];

    const handleOrderNow = (supplierName: string, productName: string) => {
        let url = '';
        if (supplierName.toLowerCase().includes('builders')) {
            url = `https://www.builders.co.za/search/?text=${encodeURIComponent(productName)}`;
        } else if (supplierName.toLowerCase().includes('leroy')) {
            url = `https://leroymerlin.co.za/catalogsearch/result/?q=${encodeURIComponent(productName)}`;
        } else if (supplierName.toLowerCase().includes('cashbuild')) {
            url = `https://www.cashbuild.co.za/search?q=${encodeURIComponent(productName)}`;
        } else {
            url = `https://www.google.com/search?q=${encodeURIComponent(productName + ' price at ' + supplierName)}`;
        }
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* PROMINENT Search Section */}
            {/* ... (keep existing code) ... */}


            <div className="glass-card p-6 gradient-border">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">
                        🔍 Search & Compare Building Material Prices
                    </h2>
                    <p className="text-slate-400">
                        Find the best deals from Builders, Leroy Merlin, Cashbuild, and local yards near you
                    </p>
                </div>

                {/* Main Search Bar */}
                <div className="flex flex-col lg:flex-row gap-4 mb-4">
                    {/* Search Input */}
                    <div className="flex-1 relative">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by product name or brand (e.g., AfriSam Cement, Corobrik Bricks...)"
                                className="input-field pl-12 pr-4 text-lg h-14 border-yellow-500/30 focus:border-yellow-500"
                            />
                        </div>

                        {/* Search Suggestions Dropdown */}
                        {showSuggestions && searchSuggestions.length > 0 && (
                            <div className="absolute z-20 top-full left-0 right-0 mt-2 glass-card rounded-xl shadow-2xl overflow-hidden animate-slide-up max-h-96 overflow-y-auto">
                                <div className="p-3 bg-slate-800/50 border-b border-slate-700">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                                        Found {searchSuggestions.length} products - Click to add
                                    </p>
                                </div>
                                {searchSuggestions.map((material) => (
                                    <div
                                        key={material.id}
                                        onClick={() => handleAddMaterial(material)} // Make whole row clickable
                                        className="p-4 hover:bg-slate-800/80 transition-colors border-b border-slate-700/50 last:border-0 cursor-pointer group"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {material.brand && (
                                                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">
                                                            {material.brand}
                                                        </span>
                                                    )}
                                                    <span className="badge badge-info text-xs">{material.category}</span>
                                                </div>
                                                <p className="text-white font-medium group-hover:text-yellow-400 transition-colors">{material.name}</p>
                                            </div>
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={quantityInputs[material.id] || 1}
                                                    onChange={(e) => setQuantityInputs({
                                                        ...quantityInputs,
                                                        [material.id]: parseInt(e.target.value) || 1
                                                    })}
                                                    className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center focus:border-yellow-500 focus:outline-none"
                                                    placeholder="Qty"
                                                />
                                                <span className="text-slate-400 text-sm min-w-[3rem]">{material.unit}s</span>
                                                <button
                                                    onClick={() => handleAddMaterial(material)}
                                                    className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-lg transition-colors shadow-lg hover:shadow-yellow-500/20"
                                                >
                                                    ADD
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Region Selector */}
                    <div className="relative min-w-[200px]">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                        <select
                            value={region}
                            onChange={(e) => setRegion(e.target.value as Region)}
                            className="input-field pl-12 pr-10 h-14 appearance-none cursor-pointer"
                        >
                            {regions.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Search Button */}
                    <button
                        onClick={handleSearch}
                        disabled={selectedMaterials.length === 0 || isSearching}
                        className="btn-primary h-14 px-8 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg transition-all"
                    >
                        {isSearching ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Search className="w-5 h-5" />
                        )}
                        Compare Prices
                        {selectedMaterials.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-slate-900/20 rounded-full text-sm font-bold">
                                {selectedMaterials.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Quick Category Buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-sm text-slate-400 py-2">Quick search:</span>
                    {categories.map((cat) => (
                        <button
                            key={cat.name}
                            onClick={() => setSearchQuery(cat.query)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-yellow-400 rounded-lg text-sm transition-colors border border-slate-700 hover:border-yellow-500/30"
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Filter Toggle */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 text-sm ${showFilters ? 'text-yellow-400' : 'text-slate-400'} hover:text-yellow-400 transition-colors`}
                >
                    <Filter className="w-4 h-4" />
                    {showFilters ? 'Hide Filters' : 'Show Advanced Filters'}
                </button>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-slate-700 animate-slide-up">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Radius */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Search Radius</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="5"
                                        max="100"
                                        value={radius}
                                        onChange={(e) => setRadius(parseInt(e.target.value))}
                                        className="flex-1 accent-yellow-500"
                                    />
                                    <span className="text-white font-medium w-16">{radius} km</span>
                                </div>
                            </div>

                            {/* Sort By */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Sort Results By</label>
                                <div className="flex gap-2">
                                    {(['price', 'distance', 'rating'] as const).map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => setSortBy(option)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === option
                                                ? 'bg-yellow-500 text-slate-900'
                                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                                }`}
                                        >
                                            {option.charAt(0).toUpperCase() + option.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Supplier Type */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Supplier Type</label>
                                <div className="flex gap-2">
                                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                        <Check className="w-4 h-4" />
                                        All
                                    </button>
                                    <button className="flex-1 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700">
                                        <Building2 className="w-4 h-4" />
                                        Chains
                                    </button>
                                    <button className="flex-1 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700">
                                        <Store className="w-4 h-4" />
                                        Local
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Selected Materials */}
                {selectedMaterials.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                        <p className="text-sm text-slate-400 mb-3">
                            📦 Selected Materials ({selectedMaterials.length}) - Ready to compare
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {selectedMaterials.map((material) => (
                                <div
                                    key={material.id}
                                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30"
                                >
                                    <div>
                                        {material.brand && (
                                            <span className="text-xs text-yellow-400">{material.brand} • </span>
                                        )}
                                        <span className="text-sm text-white">{material.name}</span>
                                        <span className="text-xs text-slate-400 ml-2">
                                            × {material.quantity} {material.unit}s
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveMaterial(material.id)}
                                        className="text-yellow-400/60 hover:text-red-400 transition-colors text-lg font-bold"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Loading State */}
            {isSearching && (
                <div className="glass-card p-12 text-center animate-fade-in">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/20 rounded-2xl mb-4">
                        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Fetching Best Prices...</h3>
                    <p className="text-slate-400">Comparing prices from Builders, Leroy Merlin, Cashbuild and local yards in {regions.find(r => r.id === region)?.label}</p>
                </div>
            )}

            {/* Results Section */}
            {!isSearching && comparisonResults.length > 0 && (
                <div className="space-y-4 animate-fade-in">
                    {/* Summary Card */}
                    <div className="glass-card p-5 gradient-border">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                                    <TrendingDown className="w-6 h-6 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Potential Savings Found</p>
                                    <p className="text-2xl font-bold text-green-400">{formatCurrency(totalSavings)}</p>
                                </div>
                            </div>
                            <div className="flex gap-4 text-sm">
                                <div className="text-center">
                                    <p className="text-slate-400">Materials</p>
                                    <p className="text-xl font-bold text-white">{comparisonResults.length}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-slate-400">Suppliers</p>
                                    <p className="text-xl font-bold text-white">5</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-slate-400">Region</p>
                                    <p className="text-xl font-bold text-yellow-400">{regions.find(r => r.id === region)?.label}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Results Table */}
                    {comparisonResults.map((result, index) => (
                        <div
                            key={result.material.id}
                            className="glass-card overflow-hidden"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {/* Material Header */}
                            <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                                            <Package className="w-5 h-5 text-yellow-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                {result.material.brand && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">
                                                        <Tag className="w-3 h-3" />
                                                        {result.material.brand}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-semibold text-white">{result.material.name}</h3>
                                            <p className="text-sm text-slate-400">
                                                Qty: {result.material.quantity} {result.material.unit} • Category: {result.material.category}
                                            </p>
                                        </div>
                                    </div>
                                    {result.potentialSavings > 0 && (
                                        <div className="badge badge-success">
                                            Save {formatCurrency(result.potentialSavings)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quotes Table */}
                            <div className="overflow-x-auto">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Supplier & Location</th>
                                            <th>Unit Price</th>
                                            <th>Total</th>
                                            <th>Stock</th>
                                            <th>Delivery</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.quotes
                                            .filter(quote => quote.distance <= radius) // FILTER BY RADIUS HERE
                                            .sort((a, b) => {
                                                if (sortBy === 'price') return a.price - b.price;
                                                if (sortBy === 'distance') return a.distance - b.distance;
                                                return 0;
                                            })
                                            .map((quote) => {
                                                const isBestPrice = quote === result.bestPrice;
                                                const total = quote.price * result.material.quantity;

                                                return (
                                                    <tr
                                                        key={quote.supplierId}
                                                        className={isBestPrice ? 'bg-green-500/5' : ''}
                                                    >
                                                        <td>
                                                            <div className="flex items-start gap-3">
                                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${quote.supplierId.includes('local')
                                                                    ? 'bg-orange-500/20'
                                                                    : 'bg-blue-500/20'
                                                                    }`}>
                                                                    {quote.supplierId.includes('local') ? (
                                                                        <Store className="w-5 h-5 text-orange-400" />
                                                                    ) : (
                                                                        <Building2 className="w-5 h-5 text-blue-400" />
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-medium text-white flex items-center gap-2 flex-wrap">
                                                                        {quote.supplierName}
                                                                        {isBestPrice && (
                                                                            <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-bold">
                                                                                BEST PRICE
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                    {/* LOCATION INFO */}
                                                                    <div className="mt-1 space-y-1">
                                                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                                                            <MapPin className="w-3 h-3 text-yellow-400" />
                                                                            {quote.supplierAddress}
                                                                        </p>
                                                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                                                            <Navigation className="w-3 h-3" />
                                                                            {quote.supplierCity}, {quote.supplierProvince} • {quote.distance} km away
                                                                        </p>
                                                                        {quote.supplierPhone && (
                                                                            <p className="text-xs text-slate-400 flex items-center gap-1">
                                                                                <Phone className="w-3 h-3" />
                                                                                {quote.supplierPhone}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                                                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                                        4.5 rating
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div>
                                                                <p className="font-bold text-white">
                                                                    {formatCurrency(quote.price)}
                                                                </p>
                                                                {quote.originalPrice && (
                                                                    <p className="text-xs text-red-400 line-through">
                                                                        {formatCurrency(quote.originalPrice)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <p className={`font-bold ${isBestPrice ? 'text-green-400' : 'text-white'}`}>
                                                                {formatCurrency(total)}
                                                            </p>
                                                        </td>
                                                        <td>
                                                            {quote.inStock ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                                                    <span className="text-green-400 text-sm">In Stock</span>
                                                                    <span className="text-xs text-slate-500">({quote.stockQuantity})</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <AlertCircle className="w-4 h-4 text-orange-400" />
                                                                    <span className="text-orange-400 text-sm">Low Stock</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                                                <Truck className="w-4 h-4 text-slate-400" />
                                                                <div>
                                                                    <p>{quote.deliveryDays} days</p>
                                                                    <p className="text-xs text-slate-500">{formatCurrency(quote.deliveryFee)}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <button
                                                                onClick={() => handleOrderNow(quote.supplierName, result.material.name)}
                                                                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-medium rounded-lg transition-colors text-sm whitespace-nowrap"
                                                            >
                                                                <ShoppingCart className="w-4 h-4" />
                                                                Order Now
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isSearching && comparisonResults.length === 0 && selectedMaterials.length === 0 && (
                <div className="glass-card p-12 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-800 rounded-2xl mb-6">
                        <Search className="w-10 h-10 text-slate-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Start Comparing Prices</h3>
                    <p className="text-slate-400 max-w-md mx-auto mb-6">
                        Use the search bar above to find products by name or brand.
                        You can search for &quot;AfriSam Cement&quot;, &quot;Corobrik Bricks&quot;, &quot;Dulux Paint&quot; and more.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {['AfriSam Cement', 'Corobrik Bricks', 'ArcelorMittal Steel', 'Dulux Paint'].map((term) => (
                            <button
                                key={term}
                                onClick={() => setSearchQuery(term)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-yellow-400 rounded-lg text-sm transition-colors border border-slate-700"
                            >
                                {term}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
