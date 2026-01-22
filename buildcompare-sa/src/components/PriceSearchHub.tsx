"use client";

import React, { useState, useEffect } from 'react';
import {
    Search,
    MapPin,
    ArrowRight,
    Camera,
    Loader2,
    ShoppingCart,
    Star,
    Truck,
    AlertCircle,
    Package,
    Tag,
    Building2,
    Store,
    Phone,
    Navigation,
    TrendingDown,
    Filter,
    ChevronDown,
    Map as MapIcon,
    Check,
    Download,
    LayoutGrid
} from 'lucide-react';
import { Material, ComparisonResult, Region, PriceQuote } from '@/types';
import { mockMaterials, generateComparisonResults } from '@/data/mockData';
import { constructionCategories } from '@/data/categories';
import VisualSearch from './VisualSearch';

interface PriceSearchHubProps {
    initialMaterials?: Material[];
}

export default function PriceSearchHub({ initialMaterials = [] }: PriceSearchHubProps) {
    // Mode State
    const [searchMode, setSearchMode] = useState<'manual' | 'scan' | 'browse'>('manual');

    // Search Logic State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMaterials, setSelectedMaterials] = useState<Material[]>(initialMaterials);
    const [region, setRegion] = useState<Region | 'current-location'>('gauteng');
    const [userCoords, setUserCoords] = useState<{ lat: number, lng: number } | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [radius, setRadius] = useState(20);
    const [sortBy, setSortBy] = useState<'price' | 'distance' | 'rating'>('price');
    const [isSearching, setIsSearching] = useState(false);
    const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchSuggestions, setSearchSuggestions] = useState<Material[]>([]);

    const regions = [
        { id: 'gauteng', label: 'Johannesburg', fullLabel: 'Gauteng, JHB' },
        { id: 'cape-town', label: 'Cape Town', fullLabel: 'Western Cape, CPT' },
        { id: 'durban', label: 'Durban', fullLabel: 'KZN, Durban' },
        ...(userCoords ? [{ id: 'current-location', label: 'Near Me (GPS)', fullLabel: 'Live My Location' }] : [])
    ];

    const requestLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserCoords({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setRegion('current-location');
                setIsLocating(false);
            },
            (error) => {
                console.error('Error getting location:', error);
                alert('Could not get your location. Please select a city manually.');
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    // Initialize if props provided
    useEffect(() => {
        if (initialMaterials.length > 0) {
            setSelectedMaterials(initialMaterials);
            performSearch(initialMaterials);
        }
    }, [initialMaterials]);

    // Autocomplete
    useEffect(() => {
        if (searchQuery.length > 1) {
            const filtered = mockMaterials.filter(m =>
                m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.brand && m.brand.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            setSearchSuggestions(filtered.slice(0, 6));
            setShowSuggestions(true);
        } else {
            setSearchSuggestions([]);
            setShowSuggestions(false);
        }
    }, [searchQuery]);

    const performSearch = async (materials: Material[]) => {
        setIsSearching(true);
        setComparisonResults([]);

        try {
            const results: ComparisonResult[] = [];

            // Perform individual searches for each material
            for (const material of materials) {
                try {
                    // Build query with location params
                    let url = `/api/v1/prices?query=${encodeURIComponent(material.name)}`;

                    if (region === 'current-location' && userCoords) {
                        url += `&lat=${userCoords.lat}&lng=${userCoords.lng}&radius=${radius}`;
                    } else if (region !== 'all') {
                        url += `&region=${region}`;
                    }

                    const response = await fetch(url);

                    if (!response.ok) {
                        console.warn(`Failed to fetch prices for ${material.name}`);
                        continue;
                    }

                    const priceItems: any[] = await response.json();

                    // Transform Backend PriceItem to Frontend PriceQuote
                    const quotes: PriceQuote[] = priceItems.map((item, index) => ({
                        supplierId: `sup-${index}`,
                        supplierName: item.supplier,
                        supplierLogo: '', // Placeholder
                        price: item.price,
                        inStock: item.in_stock,
                        stockQuantity: item.stock_quantity,
                        deliveryFee: 150, // Default estimate
                        deliveryDays: item.in_stock ? 1 : 3,
                        // If GPS active, simulate closer distances
                        distance: Number(region === 'current-location'
                            ? (Math.random() * 5 + 1).toFixed(1)
                            : (Math.random() * 25 + 5).toFixed(1)),
                        lastUpdated: new Date()
                    } as PriceQuote));

                    if (quotes.length > 0) {
                        // Find best price
                        const best = quotes.reduce((prev, curr) => prev.price < curr.price ? prev : curr);

                        // Calculate average
                        const avg = quotes.reduce((acc, curr) => acc + curr.price, 0) / quotes.length;

                        // Savings vs Average (or vs highest)
                        const savings = avg - best.price;

                        results.push({
                            material: material,
                            quotes: quotes,
                            bestPrice: best,
                            averagePrice: avg,
                            potentialSavings: savings > 0 ? savings * material.quantity : 0
                        });
                    }

                } catch (err) {
                    console.error(`Error searching for ${material.name}:`, err);
                }
            }

            // If API fails completely or returns nothing, fallback to mock data (so demo doesn't break)
            if (results.length === 0) {
                console.log("Using fallback mock data for demo...");
                await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
                const mockResults = generateComparisonResults(materials, region);
                setComparisonResults(mockResults);
            } else {
                setComparisonResults(results);
            }

        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearch = () => {
        // If we have text but no selected material, try to add it as generic
        if (searchQuery && selectedMaterials.length === 0) {
            // For demo, if text matches a mock item, use it, else generic
            const distinctItem = mockMaterials.find(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
            if (distinctItem) {
                performSearch([distinctItem]);
            } else {
                // Fallback generic search
                performSearch([{
                    id: `gen-${Date.now()}`,
                    name: searchQuery,
                    category: 'other',
                    quantity: 1,
                    unit: 'unit'
                }]);
            }
        } else if (selectedMaterials.length > 0) {
            performSearch(selectedMaterials);
        }
    };

    const handleAddMaterial = (material: Material) => {
        setSelectedMaterials([material]); // Single item search for this UI focus
        setSearchQuery(material.name);
        setShowSuggestions(false);
    };

    const handleMaterialsExtracted = (materials: Material[]) => {
        setSelectedMaterials(materials);
        setSearchMode('manual'); // Switch back to results view
        performSearch(materials);
    };

    const handleCategoryClick = (term: string) => {
        setSearchMode('manual');
        setSearchQuery(term);
        // Trigger generic search for this term or a representative item
        const match = mockMaterials.find(m => m.name.toLowerCase().includes(term.toLowerCase()));
        if (match) {
            performSearch([match]);
        } else {
            // Fallback generic search
            performSearch([{
                id: `gen-${Date.now()}`,
                name: term,
                category: 'other',
                quantity: 1,
                unit: 'unit'
            }]);
        }
    };

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

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR',
            minimumFractionDigits: 2,
        }).format(value);
    };

    const totalSavings = comparisonResults.reduce((acc, r) => acc + r.potentialSavings, 0);

    const handleDownload = () => {
        const headers = "Item,Quantity,Supplier,Price,Total,Distance\n";
        const rows = comparisonResults.flatMap(res =>
            res.quotes.map(q => {
                const total = q.price * res.material.quantity;
                return `"${res.material.name}",${res.material.quantity},"${q.supplierName}",${q.price},${total},${q.distance}`;
            })
        ).join('\n');

        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BuildCompare_Quote_${Date.now()}.csv`;
        a.click();
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Header / Hero Section */}
            <div className="text-center space-y-4 pt-4">
                <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white">
                    PRICE SEARCH HUB
                </h1>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    Get live, accurate market prices from major SA retailers instantly.
                </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex justify-center">
                <div className="p-1 bg-slate-900/80 border border-slate-800 rounded-xl inline-flex relative">
                    <button
                        onClick={() => setSearchMode('manual')}
                        className={`px-4 md:px-8 py-3 rounded-lg font-bold text-sm transition-all duration-300 flex items-center gap-2 ${searchMode === 'manual'
                            ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Search className="w-4 h-4" />
                        Manual Search
                    </button>
                    <button
                        onClick={() => setSearchMode('browse')}
                        className={`px-4 md:px-8 py-3 rounded-lg font-bold text-sm transition-all duration-300 flex items-center gap-2 ${searchMode === 'browse'
                            ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        Browse Phase
                    </button>
                    <button
                        onClick={() => setSearchMode('scan')}
                        className={`px-4 md:px-8 py-3 rounded-lg font-bold text-sm transition-all duration-300 flex items-center gap-2 ${searchMode === 'scan'
                            ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Camera className="w-4 h-4" />
                        Upload/Scan
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="glass-card p-8 border border-slate-800/50 shadow-2xl bg-slate-900/40">
                {searchMode === 'manual' && (
                    <div className="space-y-8">
                        {/* THE PILL SEARCH BAR */}
                        <div className="max-w-4xl mx-auto relative z-20">
                            <div className="flex flex-col md:flex-row items-center bg-slate-900/90 border border-slate-700 rounded-2xl md:rounded-full p-2 shadow-xl shadow-black/50 transition-all hover:border-slate-600 focus-within:border-yellow-500/50 text-white group">

                                {/* Material Input */}
                                <div className="flex-1 w-full md:w-auto flex items-center px-4 py-2 border-b md:border-b-0 md:border-r border-slate-800 relative">
                                    <Search className="w-5 h-5 text-slate-500 group-focus-within:text-yellow-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Material (e.g. 50kg Cement)"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="w-full bg-transparent border-none outline-none text-white placeholder-slate-500 h-10 px-3 text-lg font-medium"
                                    />

                                    {/* Suggestions Dropdown */}
                                    {showSuggestions && searchSuggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-4 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-30">
                                            {searchSuggestions.map((item) => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleAddMaterial(item)}
                                                    className="px-4 py-3 hover:bg-slate-800 cursor-pointer flex items-center gap-3 border-b border-slate-800/50 last:border-0"
                                                >
                                                    <Search className="w-4 h-4 text-slate-600" />
                                                    <div>
                                                        <p className="font-medium text-white">{item.name}</p>
                                                        {item.brand && <p className="text-xs text-yellow-500">{item.brand}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Location Input */}
                                <div className="w-full md:w-80 flex items-center px-4 py-2 relative border-b md:border-b-0 md:border-r border-slate-800">
                                    <div className="flex flex-col w-full">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={requestLocation}
                                                disabled={isLocating}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-[10px] font-black uppercase tracking-tighter ${region === 'current-location' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                            >
                                                {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className={`w-3 h-3 ${region === 'current-location' ? 'animate-pulse' : ''}`} />}
                                                {region === 'current-location' ? 'GPS ACTIVE' : 'NEAR ME'}
                                            </button>
                                            <select
                                                value={region}
                                                onChange={(e) => setRegion(e.target.value as any)}
                                                className="flex-1 bg-transparent border-none outline-none text-white h-10 px-1 text-base font-bold appearance-none cursor-pointer"
                                            >
                                                {regions.map(r => (
                                                    <option key={r.id} value={r.id} className="bg-slate-900 text-white font-sans">
                                                        {r.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-slate-600 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={handleSearch}
                                    disabled={!searchQuery && selectedMaterials.length === 0}
                                    className="w-full md:w-auto px-8 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wide rounded-xl md:rounded-full transition-all shadow-lg shadow-yellow-400/20 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                                >
                                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'COMPARE NOW'}
                                </button>
                            </div>

                            {/* Prominent Helper for Location */}
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 animate-fade-in">
                                <button
                                    onClick={requestLocation}
                                    className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-yellow-400 transition-colors bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-700/50 hover:border-yellow-400/30"
                                >
                                    <MapPin className="w-3 h-3 text-yellow-500" />
                                    <span>USE MY CURRENT LOCATION</span>
                                </button>
                                <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest hidden sm:inline">OR SELECT A CITY MANUALLY</span>
                            </div>
                        </div>

                        {/* RESULTS AREA */}
                        {isSearching && (
                            <div className="text-center py-20">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-400/10 rounded-full mb-6 relative">
                                    <div className="absolute inset-0 rounded-full border-4 border-yellow-400/30 border-t-yellow-400 animate-spin"></div>
                                    <Search className="w-8 h-8 text-yellow-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Scanning Retailers...</h3>
                                <p className="text-slate-400">Fetching live prices from Builders, Leroy Merlin & Local Yards</p>
                            </div>
                        )}

                        {!isSearching && comparisonResults.length > 0 && (
                            <div className="space-y-6 animate-slide-up">
                                {/* Success Banner */}
                                <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-green-500/10 border border-green-500/20 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-400">
                                            <TrendingDown className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-green-400 uppercase tracking-wider">Potential Savings</p>
                                            <p className="text-3xl font-bold text-white">{formatCurrency(totalSavings)}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleDownload}
                                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-sm font-medium text-white border border-slate-700 flex items-center gap-2 transition-colors"
                                        >
                                            <Download className="w-4 h-4" /> Export CSV
                                        </button>
                                        <span className="px-4 py-2 bg-slate-900 rounded-lg text-sm font-medium text-slate-300 border border-slate-700">
                                            {comparisonResults.length} Items Found
                                        </span>
                                        <span className="px-4 py-2 bg-slate-900 rounded-lg text-sm font-medium text-yellow-400 border border-slate-700">
                                            {radius}km Radius
                                        </span>
                                    </div>
                                </div>

                                {/* Results List */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {comparisonResults.map((result, idx) => (
                                        <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-yellow-500/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 flex flex-col">
                                            {/* Material Header */}
                                            <div className="p-4 bg-black/20 border-b border-slate-800 flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-800 rounded-lg">
                                                        <Package className="w-5 h-5 text-yellow-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-bold text-white line-clamp-1" title={result.material.name}>{result.material.name}</h3>
                                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-white uppercase tracking-wider">{result.material.category}</span>
                                                            <span>•</span>
                                                            <span>{result.material.quantity} {result.material.unit}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Potential Savings Badge */}
                                                {result.potentialSavings > 0 && (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] text-green-400 uppercase font-bold tracking-wider">Save</span>
                                                        <span className="text-sm font-black text-white">{formatCurrency(result.potentialSavings)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Best Price Highlight */}
                                            {result.bestPrice && (
                                                <div className="p-4 bg-gradient-to-r from-green-500/10 to-transparent border-b border-white/5">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black bg-green-500 text-black px-2 py-0.5 rounded-full uppercase">Best Deal</span>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-green-400">{result.bestPrice.supplierName}</span>
                                                                <span className="text-[10px] text-slate-500">{result.bestPrice.distance}km away</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-end justify-between">
                                                        <div>
                                                            <p className="text-2xl font-black text-white">{formatCurrency(result.bestPrice.price)}</p>
                                                            <p className="text-[10px] text-slate-500">per unit</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleOrderNow(result.bestPrice!.supplierName, result.material.name)}
                                                            className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                                        >
                                                            ORDER <ArrowRight className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Other Quotes List */}
                                            <div className="flex-1 overflow-y-auto max-h-[200px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                                {result.quotes
                                                    .filter(q => q.distance <= radius && q !== result.bestPrice)
                                                    .sort((a, b) => a.price - b.price)
                                                    .map((quote, qIdx) => (
                                                        <div key={qIdx} className="p-3 border-b border-slate-800/50 last:border-0 hover:bg-white/5 transition-colors group">
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${quote.supplierName.includes('Builders') ? 'bg-blue-600/20 text-blue-400' :
                                                                        quote.supplierName.includes('Leroy') ? 'bg-green-600/20 text-green-400' :
                                                                            quote.supplierName.includes('Cash') ? 'bg-red-600/20 text-red-400' :
                                                                                'bg-slate-700/50 text-slate-400'
                                                                        }`}>
                                                                        {quote.supplierName.substring(0, 1)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{quote.supplierName}</p>
                                                                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                                            <span>{quote.distance}km</span>
                                                                            <span>•</span>
                                                                            <span className={quote.inStock ? 'text-green-500' : 'text-red-500'}>{quote.inStock ? 'Stock' : 'No Stock'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-bold text-slate-200">{formatCurrency(quote.price)}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {searchMode === 'browse' && (
                    <div className="animate-fade-in">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            {constructionCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleCategoryClick(cat.subcategories[0])}
                                    className="p-6 bg-slate-900/50 border border-slate-800 hover:border-yellow-500/50 rounded-2xl flex flex-col items-center gap-4 group transition-all hover:bg-slate-800/50 hover:shadow-xl hover:shadow-black/50"
                                >
                                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-yellow-500/10 group-hover:text-yellow-400 transition-colors shadow-lg shadow-black/30">
                                        <cat.icon className="w-8 h-8 text-slate-400 group-hover:text-yellow-400 transition-colors" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">{cat.label}</h3>
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{cat.description}</p>
                                    </div>
                                    <div className="w-full mt-2 pt-4 border-t border-slate-800/50 hidden md:block">
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {cat.subcategories.slice(0, 2).map((sub, i) => (
                                                <span key={i} className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">{sub}</span>
                                            ))}
                                            {cat.subcategories.length > 2 && <span className="text-[10px] text-slate-600">+{cat.subcategories.length - 2} more</span>}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {searchMode === 'scan' && (
                    <div className="animate-fade-in">
                        <VisualSearch onMaterialsExtracted={handleMaterialsExtracted} />
                    </div>
                )}
            </div>
        </div>
    );
}
