"use client";

import React, { useState } from 'react';
import {
    TrendingUp,
    TrendingDown,
    MapPin,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    DollarSign,
    Calendar,
    Bell,
    ChevronDown,
    Building2,
    Package,
    Truck,
    PieChart,
    Target,
    Zap,
    Info,
    ArrowRight
} from 'lucide-react';

export default function CostAnalysis() {
    const [selectedMaterial, setSelectedMaterial] = useState('cement');
    const [timeRange, setTimeRange] = useState('6m');

    // Mock Trend Data
    const trends = [
        { id: 'cement', name: 'PPC Cement 42.5N', current: 105.50, change: +5.2, trend: 'up', history: [98, 99, 100, 102, 103, 104, 105.5] },
        { id: 'bricks', name: 'Corobrik Satin (1000)', current: 4200, change: -2.1, trend: 'down', history: [4350, 4300, 4280, 4260, 4240, 4220, 4200] },
        { id: 'steel', name: 'Steel Rebar Y12 (6m)', current: 89.90, change: +1.5, trend: 'up', history: [85, 86, 87, 88, 88.5, 89, 89.9] },
        { id: 'paint', name: 'Dulux Weatherguard 20L', current: 1499, change: 0.0, trend: 'stable', history: [1499, 1499, 1499, 1499, 1499, 1499, 1499] },
    ];

    const regionalData = [
        { region: 'Gauteng', cement: 105, bricks: 4.20, steel: 88, lowestCategory: 'cement' },
        { region: 'Western Cape', cement: 112, bricks: 4.50, steel: 85, lowestCategory: 'steel' },
        { region: 'KZN', cement: 108, bricks: 4.10, steel: 90, lowestCategory: 'bricks' },
        { region: 'Free State', cement: 103, bricks: 4.35, steel: 87, lowestCategory: 'cement' },
    ];

    const supplierComparison = [
        { name: 'Builders Warehouse', cement: 108, bricks: 4300, rating: 4.2, delivery: 'Free over R2000' },
        { name: 'Leroy Merlin', cement: 105, bricks: 4200, rating: 4.5, delivery: 'R150 flat' },
        { name: 'Cashbuild', cement: 102, bricks: 4150, rating: 4.0, delivery: 'Collection only' },
        { name: 'Local Yard (Avg)', cement: 99, bricks: 4000, rating: 3.8, delivery: 'Varies' },
    ];

    const costBreakdown = [
        { category: 'Materials', percentage: 62, value: 1240000, color: 'bg-yellow-500' },
        { category: 'Labor', percentage: 25, value: 500000, color: 'bg-blue-500' },
        { category: 'Logistics', percentage: 8, value: 160000, color: 'bg-purple-500' },
        { category: 'Other', percentage: 5, value: 100000, color: 'bg-slate-500' },
    ];

    const priceAlerts = [
        { material: 'PPC Cement', condition: 'Price drops below', threshold: 100, active: true },
        { material: 'Steel Rebar Y12', condition: 'Price rises above', threshold: 95, active: true },
        { material: 'Stock Bricks', condition: 'Price drops below', threshold: 3.80, active: false },
    ];

    const formatCurrency = (value: number, decimals = 2) => {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(value);
    };

    const selectedTrend = trends.find(t => t.id === selectedMaterial) || trends[0];

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
                        Market Pulse & Cost Analytics
                    </h1>
                    <p className="text-slate-400 text-lg">
                        Real-time price intelligence for smarter procurement decisions.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    {/* Time Range Selector */}
                    <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
                        {['1m', '3m', '6m', '1y'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeRange === range
                                    ? 'bg-yellow-400 text-black'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {range.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Alerts Badge */}
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:border-yellow-500/50 transition-all">
                        <Bell className="w-4 h-4" />
                        <span className="text-sm font-medium">3 Active Alerts</span>
                        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                    </button>
                </div>
            </div>

            {/* Market Alerts Banner */}
            <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <TrendingUp className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-bold text-red-400">Inflation Alert: Cement +5.2% this month</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <TrendingDown className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-bold text-green-400">Opportunity: Bricks -2.1% – Good time to buy!</span>
                </div>
            </div>

            {/* Price Ticker Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {trends.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setSelectedMaterial(item.id)}
                        className={`glass-card p-5 text-left transition-all duration-300 group ${selectedMaterial === item.id
                            ? 'border-yellow-500/50 bg-yellow-500/5'
                            : 'hover:border-slate-600'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold line-clamp-1">{item.name}</span>
                            <div className={`p-1.5 rounded-lg ${item.trend === 'up' ? 'bg-red-500/20' : item.trend === 'down' ? 'bg-green-500/20' : 'bg-slate-700'
                                }`}>
                                {item.trend === 'up' ? <ArrowUpRight className="w-4 h-4 text-red-400" /> :
                                    item.trend === 'down' ? <ArrowDownRight className="w-4 h-4 text-green-400" /> :
                                        <div className="w-4 h-1 bg-slate-500 rounded" />}
                            </div>
                        </div>

                        <div className="flex items-end gap-3 mb-4">
                            <span className="text-3xl font-black text-white">R{item.current.toFixed(2)}</span>
                            <span className={`text-sm font-bold pb-1 ${item.trend === 'up' ? 'text-red-400' : item.trend === 'down' ? 'text-green-400' : 'text-slate-500'
                                }`}>
                                {item.change > 0 ? '+' : ''}{item.change}%
                            </span>
                        </div>

                        {/* Mini Sparkline */}
                        <div className="h-8 flex items-end gap-0.5">
                            {item.history.map((val, i) => {
                                const max = Math.max(...item.history);
                                const min = Math.min(...item.history);
                                const range = max - min || 1;
                                const height = ((val - min) / range) * 100;
                                return (
                                    <div
                                        key={i}
                                        className={`flex-1 rounded-t transition-all ${item.trend === 'up' ? 'bg-red-500/60' :
                                            item.trend === 'down' ? 'bg-green-500/60' : 'bg-slate-600'
                                            } ${i === item.history.length - 1 ? 'opacity-100' : 'opacity-50'}`}
                                        style={{ height: `${Math.max(height, 10)}%` }}
                                    />
                                );
                            })}
                        </div>
                    </button>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Chart + Breakdown */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Price Trend Chart */}
                    <div className="glass-card p-6 border-t-4 border-t-yellow-400">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-yellow-400" />
                                Price Trend: {selectedTrend.name}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Calendar className="w-4 h-4" />
                                <span>{timeRange === '6m' ? 'Last 6 Months' : timeRange === '1m' ? 'Last Month' : timeRange === '3m' ? 'Last 3 Months' : 'Last Year'}</span>
                            </div>
                        </div>

                        {/* Enhanced Bar Chart */}
                        <div className="h-72 flex items-end justify-between gap-3 px-2 pb-8 border-b border-l border-slate-700/50 relative">
                            {/* Y-Axis Labels */}
                            <div className="absolute left-0 top-0 bottom-8 w-0 flex flex-col justify-between text-xs text-slate-500 -ml-2">
                                <span className="-translate-x-full pr-2">High</span>
                                <span className="-translate-x-full pr-2">Mid</span>
                                <span className="-translate-x-full pr-2">Low</span>
                            </div>

                            {/* Grid Lines */}
                            <div className="absolute top-0 left-0 right-0 bottom-8 flex flex-col justify-between pointer-events-none">
                                {[0, 1, 2, 3].map(i => (
                                    <div key={i} className="border-t border-slate-800 w-full" />
                                ))}
                            </div>

                            {/* Bars */}
                            {selectedTrend.history.map((val, i) => {
                                const max = Math.max(...selectedTrend.history);
                                const min = Math.min(...selectedTrend.history);
                                const range = max - min || 1;
                                const height = ((val - min) / range) * 80 + 20; // Min 20% height
                                const isLast = i === selectedTrend.history.length - 1;

                                return (
                                    <div key={i} className="flex-1 flex flex-col justify-end items-center group relative">
                                        <div
                                            className={`w-full max-w-[50px] rounded-t-xl transition-all duration-500 ${isLast ? 'bg-yellow-400 shadow-lg shadow-yellow-400/30' : 'bg-slate-700 group-hover:bg-slate-600'
                                                }`}
                                            style={{ height: `${height}%` }}
                                        >
                                            {/* Tooltip */}
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-xl">
                                                <span className="font-bold">R{val.toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs text-slate-500 mt-3 absolute -bottom-6">
                                            {timeRange === '6m' ? `M${i + 1}` : timeRange === '1y' ? `Q${i + 1}` : `W${i + 1}`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                                <span className="text-slate-300">Current Price</span>
                            </span>
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-slate-700 rounded"></div>
                                <span className="text-slate-300">Historical</span>
                            </span>
                        </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="glass-card p-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                            <PieChart className="w-5 h-5 text-purple-400" />
                            Project Cost Breakdown
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Donut Chart Simulation */}
                            <div className="relative w-48 h-48 mx-auto">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    {costBreakdown.reduce((acc, item, i) => {
                                        const prevOffset = acc.offset;
                                        const circumference = 2 * Math.PI * 40;
                                        const strokeLength = (item.percentage / 100) * circumference;
                                        const colorClass = item.color.replace('bg-', 'stroke-');

                                        acc.elements.push(
                                            <circle
                                                key={item.category}
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="none"
                                                strokeWidth="12"
                                                className={colorClass}
                                                strokeDasharray={`${strokeLength} ${circumference}`}
                                                strokeDashoffset={-prevOffset}
                                                style={{ transition: 'all 0.5s ease' }}
                                            />
                                        );
                                        acc.offset += strokeLength;
                                        return acc;
                                    }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black text-white">R2M</span>
                                    <span className="text-xs text-slate-400">Total</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="space-y-3 flex flex-col justify-center">
                                {costBreakdown.map((item) => (
                                    <div key={item.category} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded ${item.color}`}></div>
                                            <span className="text-white font-medium">{item.category}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-white font-bold">{item.percentage}%</span>
                                            <span className="text-slate-500 text-xs block">{formatCurrency(item.value, 0)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Insights */}
                <div className="space-y-6">
                    {/* Supplier Comparison */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <Building2 className="w-5 h-5 text-blue-400" />
                            Supplier Comparison
                        </h3>
                        <div className="space-y-3">
                            {supplierComparison.map((supplier, i) => (
                                <div
                                    key={supplier.name}
                                    className={`p-4 rounded-xl border transition-all ${i === 3 ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-white">{supplier.name}</span>
                                        {i === 3 && <span className="text-[10px] bg-green-500 text-black px-2 py-0.5 rounded-full font-bold">BEST VALUE</span>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-slate-500 text-xs">Cement</span>
                                            <span className="block text-slate-300 font-medium">R{supplier.cement}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 text-xs">Bricks</span>
                                            <span className="block text-slate-300 font-medium">R{supplier.bricks}</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                        <Truck className="w-3 h-3" />
                                        {supplier.delivery}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Regional Heatmap */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <MapPin className="w-5 h-5 text-orange-400" />
                            Regional Price Map
                        </h3>
                        <div className="space-y-3">
                            {regionalData.map((region) => (
                                <div key={region.region} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-600 transition-all">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-bold text-white">{region.region}</span>
                                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-bold uppercase">
                                            Lowest: {region.lowestCategory}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 text-center text-xs">
                                        <div className={`p-2 rounded ${region.lowestCategory === 'cement' ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                                            <span className="block text-[10px] uppercase mb-1">Cement</span>
                                            <span className="font-bold">R{region.cement}</span>
                                        </div>
                                        <div className={`p-2 rounded ${region.lowestCategory === 'bricks' ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                                            <span className="block text-[10px] uppercase mb-1">Bricks</span>
                                            <span className="font-bold">R{region.bricks}</span>
                                        </div>
                                        <div className={`p-2 rounded ${region.lowestCategory === 'steel' ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                                            <span className="block text-[10px] uppercase mb-1">Steel</span>
                                            <span className="font-bold">R{region.steel}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pro Tip */}
                    <div className="glass-card p-6 bg-gradient-to-br from-yellow-500/10 via-transparent to-orange-500/5 border-yellow-500/20">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-yellow-400/20 rounded-xl">
                                <Zap className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-lg mb-1">AI Insight</h4>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    Based on your project in <strong>Gauteng</strong>, switching to <strong>Cashbuild</strong> for cement could save you <strong className="text-green-400">R6,500</strong> on your current order.
                                </p>
                                <button className="mt-3 text-sm text-yellow-400 font-bold flex items-center gap-1 hover:gap-2 transition-all">
                                    View Recommendation <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
