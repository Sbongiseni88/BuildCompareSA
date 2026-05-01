"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

    Map as MapIcon,
    Check,
    Download,
    LayoutGrid,
    FileText,
    MessageCircle,
    Share2,
    ExternalLink,
    CheckCircle2,
    Hammer,
    Zap,
    Droplets,
    BrickWall,
    PaintBucket,
    FolderTree,
    Waves
} from 'lucide-react';
import { Material, ComparisonResult, PriceQuote } from '@/types';

import { constructionCategories } from '@/data/categories';
import VisualSearch from './VisualSearch';
import { useToast } from '@/contexts/ToastContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';

interface PriceSearchHubProps {
    initialMaterials?: Material[];
}

const popularSearchItems: Material[] = [
    { id: 'mat-1', name: 'PPC Surebuild Cement 42.5N', category: 'cement', quantity: 1, unit: 'bag' },
    { id: 'mat-2', name: 'AfriSam All Purpose Cement 50kg', category: 'cement', quantity: 1, unit: 'bag' },
    { id: 'mat-3', name: 'Corobrik Clay Face Brick', category: 'bricks', quantity: 1000, unit: 'each' },
    { id: 'mat-4', name: 'Cement Stock Brick', category: 'bricks', quantity: 1000, unit: 'each' },
    { id: 'mat-5', name: 'Y12 Rebar 6m', category: 'steel', quantity: 1, unit: 'length' },
    { id: 'mat-6', name: 'SA Pine Structural Timber 38x114mm x 6m', category: 'timber', quantity: 1, unit: 'length' },
    { id: 'mat-7', name: 'Dulux Weatherguard Exterior Paint 20L', category: 'paint', quantity: 1, unit: 'bucket' },
    { id: 'mat-8', name: 'IBR Roof Sheeting 0.47mm x 6m', category: 'roofing', quantity: 1, unit: 'sheet' },
];

export default function PriceSearchHub({ initialMaterials = [] }: PriceSearchHubProps) {
    const { user } = useAuthContext();
    const supabase = createClient();
    const { showWarning, showSuccess, showInfo } = useToast();
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const [searchMode, setSearchMode] = useState<'manual' | 'scan'>('manual');

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMaterials, setSelectedMaterials] = useState<Material[]>(initialMaterials);
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [locationLabel, setLocationLabel] = useState('');
    const [manualLocation, setManualLocation] = useState('');
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [radius, setRadius] = useState(20);
    const [sortBy, setSortBy] = useState<'price' | 'distance' | 'rating'>(() => {
        try { return (sessionStorage.getItem('bc_search_sort') as any) || 'price'; } catch { return 'price'; }
    });
    const [isSearching, setIsSearching] = useState(false);
    const [searchStep, setSearchStep] = useState(0);
    const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchSuggestions, setSearchSuggestions] = useState<Material[]>([]);

    // Save sort pref
    React.useEffect(() => {
        try { sessionStorage.setItem('bc_search_sort', sortBy); } catch { }
    }, [sortBy]);

    // Auto-request location on mount
    React.useEffect(() => {
        requestLocation();
    }, []);

    const requestLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            return;
        }

        setIsLocating(true);
        setLocationError(null);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setUserCoords(coords);
                setIsLocating(false);

                // Reverse geocode to show a friendly label
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=14&addressdetails=1`,
                        { headers: { 'User-Agent': 'BuildCompareSA/1.0' } }
                    );
                    if (res.ok) {
                        const data = await res.json();
                        const addr = data.address || {};
                        const label = [addr.suburb, addr.city || addr.town || addr.village, addr.state].filter(Boolean).join(', ');
                        setLocationLabel(label || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
                    }
                } catch {
                    setLocationLabel(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                setIsLocating(false);
                setLocationError('Location access denied. Enter your suburb below.');
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
    };

    /** Geocode a manual suburb/address entry into lat/lng */
    const geocodeManualLocation = async () => {
        if (!manualLocation.trim()) return;
        setIsLocating(true);
        setLocationError(null);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualLocation + ', South Africa')}&limit=1`,
                { headers: { 'User-Agent': 'BuildCompareSA/1.0' } }
            );
            if (res.ok) {
                const results = await res.json();
                if (results.length > 0) {
                    const coords = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
                    setUserCoords(coords);
                    setLocationLabel(results[0].display_name?.split(',').slice(0, 3).join(',') || manualLocation);
                    showSuccess(`Location set to ${manualLocation}`);
                } else {
                    setLocationError(`Could not find "${manualLocation}". Try a more specific suburb.`);
                }
            }
        } catch {
            setLocationError('Geocoding failed. Check your internet connection.');
        } finally {
            setIsLocating(false);
        }
    };

    // Kick off search immediately when materials are passed in from another tab
    useEffect(() => {
        if (initialMaterials.length > 0) {
            setSelectedMaterials(initialMaterials);
            performSearch(initialMaterials);
        }
    }, [initialMaterials]);

    // Debounced autocomplete — waits 200ms after typing stops
    React.useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (searchQuery.length > 1) {
            debounceRef.current = setTimeout(() => {
                const q = searchQuery.toLowerCase();
                const qWords = q.split(/\s+/);
                const materialMatches = popularSearchItems.filter(m => {
                    const targetStr = m.name.toLowerCase() + " " + (m.brand?.toLowerCase() || "");
                    return qWords.every(w => targetStr.includes(w));
                });
                // Pull in subcategory names too for wider coverage
                const catMatches: Material[] = [];
                constructionCategories.forEach(cat => {
                    cat.subcategories.forEach(sub => {
                        if (sub.toLowerCase().includes(q) && !materialMatches.find(m => m.name.toLowerCase() === sub.toLowerCase())) {
                            catMatches.push({ id: `cat-${sub}`, name: sub, category: cat.id as any, quantity: 1, unit: 'unit' });
                        }
                    });
                });
                setSearchSuggestions([...materialMatches, ...catMatches].slice(0, 6));
                setShowSuggestions(true);
                setHighlightedIndex(-1);
            }, 200);
        } else {
            setSearchSuggestions([]);
            setShowSuggestions(false);
            setHighlightedIndex(-1);
        }
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchQuery]);

    const performSearch = async (materials: Material[]) => {
        if (isSearching) return; // Prevent Double Click loops!
        setIsSearching(true);
        setSearchStep(1); // Stage 1: Parsing query
        setComparisonResults([]);

        try {
            await new Promise(r => setTimeout(r, 500)); // UX delay for Stage 1
            setSearchStep(2); // Stage 2: AI agent searching

            // Call the Price Intelligence Agent for each material in PARALLEL
            const fetchPromises = materials.map(async (material): Promise<ComparisonResult | null> => {
                try {
                    const params = new URLSearchParams({ q: material.search_string || material.name });
                    if (userCoords) {
                        params.set('lat', userCoords.lat.toString());
                        params.set('lng', userCoords.lng.toString());
                    }
                    params.set('radius', radius.toString());
                    const res = await fetch(`/api/prices/compare?${params.toString()}`);

                    if (!res.ok) return null;
                    const data = await res.json();

                    if (!data.success || !data.results || data.results.length === 0) return null;

                    // Map the compare agent results into our PriceQuote format
                    const quotes: PriceQuote[] = data.results.map((r: any) => ({
                        supplierId: r.store,
                        supplierName: r.storeName,
                        supplierLogo: '',
                        supplierType: r.storeType || 'chain',
                        price: r.price,
                        originalPrice: undefined,
                        inStock: r.inStock,
                        stockQuantity: undefined,
                        deliveryFee: r.deliveryCost || 0,
                        deliveryDays: 2,
                        distance: r.distance || 5,
                        productUrl: r.url,
                        isFallback: r.source !== 'live-scrape',
                        laborCostEstimate: r.laborEstimate || undefined,
                        priceConfidence: r.priceConfidence || 'medium',
                        lastUpdated: new Date(),
                    } as PriceQuote));

                    // Trigger Price Drop Notification if discount > 5%
                    if (user && data.cheapest && data.marketInsight?.averagePrice) {
                        const avgVal = data.marketInsight.averagePrice;
                        const currentVal = data.cheapest.price;
                        const discountVal = (avgVal - currentVal) / avgVal;

                        if (discountVal > 0.05) {
                            const title = `Price Drop: ${data.cheapest.product}`;
                            // Only insert if not already alerted for this product today
                            const { data: existing } = await supabase
                                .from('notifications')
                                .select('id')
                                .eq('user_id', user.id)
                                .eq('title', title)
                                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

                            if (!existing || existing.length === 0) {
                                await supabase.from('notifications').insert({
                                    user_id: user.id,
                                    type: 'price-drop',
                                    title: title,
                                    message: `${data.cheapest.product} is now R${currentVal} at ${data.cheapest.storeName} (${Math.round(discountVal * 100)}% below market average).`,
                                    read: false
                                });
                            }
                        }
                    }

                    const validQuotes = quotes.filter(q => typeof q.price === 'number' && q.price > 0);
                    if (validQuotes.length === 0) return null;

                    const best = validQuotes.reduce((prev, curr) => prev.price < curr.price ? prev : curr);
                    const avg = validQuotes.reduce((acc, curr) => acc + curr.price, 0) / validQuotes.length;
                    const savings = avg - best.price;

                    // Update material name if the agent normalized it
                    const updatedMaterial = {
                        ...material,
                        name: data.query?.product ? `${data.query.brand || ''} ${data.query.product} ${data.query.size || ''} ${data.query.grade || ''}`.trim() : material.name,
                        category: data.query?.category || material.category,
                    };

                    return {
                        material: updatedMaterial,
                        quotes: validQuotes,
                        bestPrice: best,
                        averagePrice: avg,
                        potentialSavings: savings > 0 ? savings * material.quantity : 0,
                        isLive: validQuotes.some(q => !q.isFallback),
                        marketInsight: data.marketInsight,
                        comparisonNote: data.comparisonNote,
                    } as ComparisonResult;
                } catch (err) {
                    console.error(`Error searching for ${material.name}:`, err);
                    return null;
                }
            });

            const settled = await Promise.allSettled(fetchPromises);
            setSearchStep(3); // Stage 3: Verifying accuracy
            await new Promise(r => setTimeout(r, 600)); // UX delay for Stage 3

            const results: ComparisonResult[] = settled
                .filter((r): r is PromiseFulfilledResult<ComparisonResult | null> => r.status === 'fulfilled' && r.value !== null)
                .map(r => r.value as ComparisonResult);

            if (results.length > 0) {
                setComparisonResults(results);
            } else {
                showWarning("No results found. Try simplifying your search (e.g. 'cement 50kg' instead of a full product name).");
            }

        } catch (error) {
            console.error("Search failed:", error);
            showWarning("Search encountered a critical error. Please try again.");
        } finally {
            setIsSearching(false);
            setSearchStep(0);
        }
    };

    const handleSearch = () => {
        // Typed something but didn't pick from dropdown — just search the raw text
        if (searchQuery && selectedMaterials.length === 0) {
            // Fuzzy match the distinct item first
            const qWords = searchQuery.toLowerCase().split(/\s+/);
            const distinctItem = popularSearchItems.find(m => {
                const targetStr = m.name.toLowerCase() + " " + (m.brand?.toLowerCase() || "");
                return qWords.every(w => targetStr.includes(w));
            });
            if (distinctItem) {
                performSearch([distinctItem]);
            } else {
                // Freeform search
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
        // Try to find a matching material, otherwise search the raw term
        const match = popularSearchItems.find(m => m.name.toLowerCase().includes(term.toLowerCase()));
        if (match) {
            performSearch([match]);
        } else {
            // No match — freeform search
            performSearch([{
                id: `gen-${Date.now()}`,
                name: term,
                category: 'other',
                quantity: 1,
                unit: 'unit'
            }]);
        }
    };

    const handleOrderNow = (supplierName: string, productName: string, manualUrl?: string) => {
        if (manualUrl) {
            window.open(manualUrl, '_blank');
            return;
        }

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

    const handleRequestQuote = (supplierName: string, productName: string) => {
        showSuccess(`Quote request for ${productName} sent to ${supplierName}`);
        setTimeout(() => {
             const message = `Hi ${supplierName}, I'd like to request a quote for ${productName}.`;
             window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        }, 1500);
    };

    const formatCurrency = useCallback((value: number) => {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR',
            minimumFractionDigits: 2,
        }).format(value);
    }, []);

    const totalSavings = useMemo(
        () => comparisonResults.reduce((acc, r) => acc + r.potentialSavings, 0),
        [comparisonResults]
    );

    const handleDownload = () => {
        const headers = "Item,Quantity,Supplier,Material Price,Labour Estimate,Total Value,Distance\n";
        const rows = comparisonResults.flatMap(res =>
            res.quotes.map(q => {
                const materialTotal = q.price * res.material.quantity;
                const laborTotal = (q.laborCostEstimate || 0) * res.material.quantity; // labor per original unit
                const total = materialTotal + laborTotal;
                return `"${res.material.name}",${res.material.quantity},"${q.supplierName}",${q.price},${laborTotal},${total},${q.distance}`;
            })
        ).join('\n');

        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BuildCompare_Quote_${Date.now()}.csv`;
        a.click();
    };

    // Build a WhatsApp-friendly message with the best deals and send via wa.me
    const handleShareWhatsApp = () => {
        const lines = comparisonResults
            .filter(r => r.bestPrice)
            .map(r => `• ${r.material.name}: ${formatCurrency(r.bestPrice!.price)} at ${r.bestPrice!.supplierName} (${r.bestPrice!.distance}km away)`)
            .join('\n');

        const message = `🏗️ *BuildCompare SA — Price Alert*\n\nI found these deals:\n${lines}\n\n💰 Total potential savings: ${formatCurrency(totalSavings)}\n\nCompare prices yourself 👉 https://buildcompare-sa.vercel.app`;

        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    // Uses Web Share API on mobile, falls back to clipboard on desktop
    const handleShareGeneral = async () => {
        const lines = comparisonResults
            .filter(r => r.bestPrice)
            .map(r => `${r.material.name}: ${formatCurrency(r.bestPrice!.price)} at ${r.bestPrice!.supplierName}`)
            .join('\n');

        const text = `BuildCompare SA — Price Comparison\n\n${lines}\n\nSavings: ${formatCurrency(totalSavings)}\n\nhttps://buildcompare-sa.vercel.app`;

        if (navigator.share) {
            try {
                await navigator.share({ title: 'BuildCompare SA Quote', text });
            } catch (e) {
                // User cancelled the share dialog — nothing to handle
            }
        } else {
            await navigator.clipboard.writeText(text);
            showSuccess('Quote copied to clipboard!');
        }
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
                        onClick={() => setSearchMode('scan')}
                        className={`px-4 md:px-8 py-3 rounded-lg font-bold text-sm transition-all duration-300 flex items-center gap-2 ${searchMode === 'scan'
                            ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Upload BoQ
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
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setSelectedMaterials([]); // CLEAR previously selected object if user starts typing manually
                                        }}
                                        onKeyDown={(e) => {
                                            if (showSuggestions && searchSuggestions.length > 0) {
                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setHighlightedIndex(prev => Math.min(prev + 1, searchSuggestions.length - 1));
                                                } else if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setHighlightedIndex(prev => Math.max(prev - 1, -1));
                                                } else if (e.key === 'Enter' && highlightedIndex >= 0) {
                                                    e.preventDefault();
                                                    handleAddMaterial(searchSuggestions[highlightedIndex]);
                                                    setShowSuggestions(false);
                                                } else if (e.key === 'Escape') {
                                                    setShowSuggestions(false);
                                                } else if (e.key === 'Enter') {
                                                    handleSearch();
                                                }
                                            } else if (e.key === 'Enter') {
                                                handleSearch();
                                            }
                                        }}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        className="w-full bg-transparent border-none outline-none text-white placeholder-slate-500 h-10 px-3 text-lg font-medium"
                                    />

                                    {/* Smart Suggestions Dropdown */}
                                    {showSuggestions && searchSuggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-4 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-30">
                                            {searchSuggestions.map((item, idx) => {
                                                // Bold the part of the name that matches the user's query
                                                const q = searchQuery.toLowerCase();
                                                const nameIdx = item.name.toLowerCase().indexOf(q);
                                                const nameDisplay = nameIdx >= 0 ? (
                                                    <>{item.name.slice(0, nameIdx)}<span className="text-yellow-400 font-bold">{item.name.slice(nameIdx, nameIdx + q.length)}</span>{item.name.slice(nameIdx + q.length)}</>
                                                ) : item.name;

                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => handleAddMaterial(item)}
                                                        onMouseEnter={() => setHighlightedIndex(idx)}
                                                        className={`px-4 py-3 cursor-pointer flex items-center gap-3 border-b border-slate-800/50 last:border-0 transition-colors ${idx === highlightedIndex ? 'bg-slate-800 border-l-2 border-l-yellow-400' : 'hover:bg-slate-800/50'}`}
                                                    >
                                                        <Search className="w-4 h-4 text-slate-600 flex-shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-white truncate">{nameDisplay}</p>
                                                            {item.brand && <p className="text-xs text-yellow-500">{item.brand}</p>}
                                                            {!item.brand && item.category !== 'other' && <p className="text-xs text-slate-500 capitalize">{item.category}</p>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div className="px-4 py-2 text-xs text-slate-600 bg-slate-900/80 flex items-center gap-2">
                                                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px]">↑↓</kbd> navigate
                                                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px]">↵</kbd> select
                                                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px]">esc</kbd> close
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Location Input */}
                                <div className="w-full md:w-96 flex items-center px-4 py-2 relative border-b md:border-b-0 md:border-r border-slate-800">
                                    <div className="flex flex-col w-full gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={requestLocation}
                                                disabled={isLocating}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-[10px] font-black uppercase tracking-tighter ${userCoords ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                            >
                                                {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className={`w-3 h-3 ${userCoords ? 'animate-pulse' : ''}`} />}
                                                {userCoords ? 'GPS ACTIVE' : 'USE GPS'}
                                            </button>
                                            {userCoords && locationLabel && (
                                                <span className="text-xs text-slate-300 font-medium truncate max-w-[180px]" title={locationLabel}>
                                                    📍 {locationLabel}
                                                </span>
                                            )}
                                        </div>
                                        {!userCoords && (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="text"
                                                    value={manualLocation}
                                                    onChange={(e) => setManualLocation(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && geocodeManualLocation()}
                                                    placeholder="Or type suburb (e.g. Sandton)"
                                                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-600 h-8 text-sm"
                                                />
                                                {manualLocation && (
                                                    <button
                                                        onClick={geocodeManualLocation}
                                                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold rounded transition-colors"
                                                    >
                                                        SET
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {locationError && (
                                            <p className="text-[10px] text-orange-400 font-medium">{locationError}</p>
                                        )}
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
                                {!userCoords && (
                                    <button
                                        onClick={requestLocation}
                                        className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-yellow-400 transition-colors bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-700/50 hover:border-yellow-400/30"
                                    >
                                        <MapPin className="w-3 h-3 text-yellow-500" />
                                        <span>ALLOW LOCATION FOR NEARBY STORE RESULTS</span>
                                    </button>
                                )}
                                {userCoords && (
                                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                                        📍 Searching stores within {radius}km of your location
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* RESULTS AREA */}
                        {isSearching && (
                            <div className="text-center py-20">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-400/10 rounded-full mb-6 relative">
                                    <div className="absolute inset-0 rounded-full border-4 border-yellow-400/30 border-t-yellow-400 animate-spin"></div>
                                    <Search className="w-8 h-8 text-yellow-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    {searchStep === 1 && "Parsing your query..."}
                                    {searchStep === 2 && "AI agent searching for prices..."}
                                    {searchStep === 3 && "Comparing like-for-like across stores..."}
                                    {searchStep === 0 && "Initializing..."}
                                </h3>
                                <p className="text-slate-400">Checking Builders, Cashbuild, Build it, Leroy Merlin & BUCO</p>
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
                                    <div className="flex flex-wrap gap-2">
                                        {/* WhatsApp Share */}
                                        <button
                                            onClick={handleShareWhatsApp}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-bold text-white flex items-center gap-2 transition-all hover:scale-105 shadow-lg shadow-green-600/20"
                                        >
                                            <MessageCircle className="w-4 h-4" /> Share via WhatsApp
                                        </button>
                                        {/* Generic Share */}
                                        <button
                                            onClick={handleShareGeneral}
                                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-sm font-medium text-white border border-slate-700 flex items-center gap-2 transition-colors"
                                        >
                                            <Share2 className="w-4 h-4" /> Share
                                        </button>
                                        {/* CSV Export */}
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

                                {/* Market Intelligence Banner */}
                                {comparisonResults.some(r => r.marketInsight || r.comparisonNote) && (
                                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl flex gap-3">
                                        <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <AlertCircle className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div className="space-y-1">
                                            {comparisonResults[0]?.marketInsight && (
                                                <p className="text-sm text-blue-300 font-medium">{comparisonResults[0].marketInsight}</p>
                                            )}
                                            {comparisonResults[0]?.comparisonNote && (
                                                <p className="text-xs text-slate-400 italic">{comparisonResults[0].comparisonNote}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Results List */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {comparisonResults.map((result, idx) => (
                                        <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-yellow-500/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 flex flex-col relative group">
                                            {/* Price Confidence Badge */}
                                            <div className="absolute top-2 right-2 z-10">
                                                {(() => {
                                                    const confidence = result.bestPrice?.priceConfidence || (result.isLive ? 'high' : 'medium');
                                                    if (confidence === 'high') return (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-[9px] font-bold rounded-full border border-green-500/30 backdrop-blur-sm">
                                                            <CheckCircle2 className="w-2.5 h-2.5" /> LIVE PRICE
                                                        </span>
                                                    );
                                                    if (confidence === 'medium') return (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400/70 text-[9px] font-bold rounded-full border border-blue-500/20 backdrop-blur-sm">
                                                            <CheckCircle2 className="w-2.5 h-2.5" /> MARKET RATE
                                                        </span>
                                                    );
                                                    return (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-500/70 text-[9px] font-bold rounded-full border border-yellow-500/20 backdrop-blur-sm">
                                                            <AlertCircle className="w-2.5 h-2.5" /> ESTIMATE
                                                        </span>
                                                    );
                                                })()}
                                            </div>

                                            {/* Material Header */}
                                            <div className="p-4 bg-black/20 border-b border-slate-800 flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-800 rounded-lg">
                                                        {(() => {
                                                            const cat = result.material.category.toLowerCase();
                                                            if (cat.includes('cement')) return <Waves className="w-5 h-5 text-blue-400" />;
                                                            if (cat.includes('brick')) return <BrickWall className="w-5 h-5 text-orange-400" />;
                                                            if (cat.includes('plumb')) return <Droplets className="w-5 h-5 text-cyan-400" />;
                                                            if (cat.includes('elec')) return <Zap className="w-5 h-5 text-yellow-400" />;
                                                            if (cat.includes('paint')) return <PaintBucket className="w-5 h-5 text-purple-400" />;
                                                            if (cat.includes('timber') || cat.includes('wood')) return <FolderTree className="w-5 h-5 text-emerald-400" />;
                                                            if (cat.includes('hard') || cat.includes('tool')) return <Hammer className="w-5 h-5 text-slate-300" />;
                                                            return <Package className="w-5 h-5 text-yellow-400" />;
                                                        })()}
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
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Material Only</p>
                                                                {result.bestPrice.laborCostEstimate && (
                                                                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-[9px] text-orange-400 font-bold">
                                                                        + {formatCurrency(result.bestPrice.laborCostEstimate)} Labor
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {result.bestPrice.supplierType === 'contractor' ? (
                                                            <button
                                                                onClick={() => handleRequestQuote(result.bestPrice!.supplierName, result.material.name)}
                                                                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-lg shadow-orange-500/20"
                                                            >
                                                                REQUEST QUOTE <Hammer className="w-3 h-3" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleOrderNow(result.bestPrice!.supplierName, result.material.name, result.bestPrice!.productUrl)}
                                                                className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                                            >
                                                                ORDER <ExternalLink className="w-3 h-3" />
                                                            </button>
                                                        )}
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
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${quote.supplierType === 'contractor' ? 'bg-orange-500/20 text-orange-400' :
                                                                        quote.supplierName.includes('Builders') ? 'bg-blue-600/20 text-blue-400' :
                                                                        quote.supplierName.includes('Leroy') ? 'bg-green-600/20 text-green-400' :
                                                                            quote.supplierName.includes('Cash') ? 'bg-red-600/20 text-red-400' :
                                                                                'bg-slate-700/50 text-slate-400'
                                                                        }`}>
                                                                        {quote.supplierType === 'contractor' ? <Hammer className="w-4 h-4" /> : quote.supplierName.substring(0, 1)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{quote.supplierName}</p>
                                                                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                                            <span>{quote.distance}km</span>
                                                                            <span>•</span>
                                                                            {quote.laborCostEstimate && (
                                                                                <span className="text-orange-500/70 font-semibold italic text-[9px]">L: {formatCurrency(quote.laborCostEstimate)}</span>
                                                                            )}
                                                                            <span>•</span>
                                                                            {quote.supplierType === 'contractor' ? (
                                                                                <span className="text-orange-400 font-bold">Avail. {quote.deliveryDays ? `${quote.deliveryDays} Days` : 'Soon'}</span>
                                                                            ) : (
                                                                                <span className={quote.inStock ? 'text-green-500' : 'text-red-500'}>{quote.inStock ? 'Stock' : 'No Stock'}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <p className="text-sm font-bold text-slate-200">{formatCurrency(quote.price)}</p>
                                                                    {quote.supplierType === 'contractor' ? (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleRequestQuote(quote.supplierName, result.material.name);
                                                                            }}
                                                                            className="px-2 py-1 bg-slate-800 hover:bg-orange-500 hover:text-white text-[10px] font-bold rounded-md transition-all flex items-center gap-1 active:scale-95"
                                                                        >
                                                                            REQUEST
                                                                            <Hammer className="w-2.5 h-2.5" />
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleOrderNow(quote.supplierName, result.material.name, quote.productUrl);
                                                                            }}
                                                                            className="px-2 py-1 bg-slate-800 hover:bg-yellow-400 hover:text-slate-900 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 active:scale-95"
                                                                        >
                                                                            ORDER
                                                                            <ExternalLink className="w-2.5 h-2.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Price Disclaimer */}
                                <div className="mt-8 p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-center">
                                    <p className="text-xs text-slate-500 max-w-2xl mx-auto italic">
                                        Note: Material prices fluctuate daily based on retailer updates and regional stock levels. {comparisonResults.some(r => !r.isLive) ? 'Some results are currently shown as "Market Estimates". ' : ''}Always confirm final pricing on the supplier's checkout page before completing your order.
                                    </p>
                                </div>
                            </div>
                        )}
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
