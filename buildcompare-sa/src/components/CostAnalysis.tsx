"use client";

import React from 'react';
import { TrendingUp, TrendingDown, MapPin, BarChart3, ArrowUpRight, ArrowDownRight, AlertCircle, DollarSign } from 'lucide-react';

export default function CostAnalysis() {
    // Mock Trend Data
    const trends = [
        { name: 'PPC Cement 42.5N', current: 105.50, change: +5.2, trend: 'up', history: [98, 99, 100, 102, 105.5] },
        { name: 'Corobrik Satin (1000)', current: 4200, change: -2.1, trend: 'down', history: [4350, 4300, 4280, 4250, 4200] },
        { name: 'Steel Rebar Y12 (6m)', current: 89.90, change: +1.5, trend: 'up', history: [85, 86, 88, 88.5, 89.9] },
        { name: 'Dulux Weatherguard 20L', current: 1499, change: 0.0, trend: 'stable', history: [1499, 1499, 1499, 1499, 1499] },
    ];

    const regionalAvgs = [
        { region: 'Gauteng', cement: 105, bricks: 4.20 },
        { region: 'Western Cape', cement: 112, bricks: 4.50 },
        { region: 'KZN', cement: 108, bricks: 4.30 },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-1">Market Pulse & Cost Analytics</h2>
                    <p className="text-slate-400">Real-time material price tracking across South Africa.</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-red-500/10 text-red-400 text-xs font-bold rounded-full border border-red-500/20 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Inflation Alert: 5.2% (Cement)
                    </span>
                    <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded-full border border-green-500/20 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> Opportunity: Bricks Down
                    </span>
                </div>
            </div>

            {/* Tickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {trends.map((item) => (
                    <div key={item.name} className="glass-card p-4 hover:border-yellow-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{item.name}</span>
                            {item.trend === 'up' ? <ArrowUpRight className="w-4 h-4 text-red-500" /> :
                                item.trend === 'down' ? <ArrowDownRight className="w-4 h-4 text-green-500" /> :
                                    <div className="w-4 h-1 bg-slate-600 mt-2" />}
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl font-bold text-white">R{item.current.toFixed(2)}</span>
                            <span className={`text-xs font-bold mb-1 ${item.trend === 'up' ? 'text-red-500' :
                                    item.trend === 'down' ? 'text-green-500' : 'text-slate-500'
                                }`}>
                                {item.change > 0 ? '+' : ''}{item.change}%
                            </span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 mt-3 rounded-full overflow-hidden flex gap-0.5">
                            {item.history.map((val, i) => (
                                <div
                                    key={i}
                                    className={`h-full flex-1 ${item.trend === 'up' ? 'bg-red-500/50' : 'bg-green-500/50'}`}
                                    style={{ opacity: (i + 1) / 5 }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Graph */}
                <div className="lg:col-span-2 glass-card p-6 border-t-4 border-t-yellow-400">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-yellow-400" />
                            6-Month Price Forecast
                        </h3>
                        <select className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1">
                            <option>Cement (50kg)</option>
                            <option>Bricks (1000)</option>
                            <option>Steel</option>
                        </select>
                    </div>

                    {/* CSS Chart Simulation */}
                    <div className="h-64 flex items-end justify-between gap-2 px-4 border-b border-l border-slate-700 relative">
                        {/* Grid Lines */}
                        <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-between pointer-events-none opacity-20">
                            <div className="border-t border-slate-500 w-full"></div>
                            <div className="border-t border-slate-500 w-full"></div>
                            <div className="border-t border-slate-500 w-full"></div>
                        </div>

                        {/* Bars */}
                        {[65, 68, 72, 60, 75, 82, 90, 85].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col justify-end items-center group">
                                <div
                                    className="w-full max-w-[40px] bg-yellow-400 hover:bg-yellow-300 transition-all rounded-t-lg relative"
                                    style={{ height: `${h}%` }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        R{90 + (h / 2)}
                                    </div>
                                </div>
                                <span className="text-xs text-slate-500 mt-2">M{i + 1}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-400 justify-center">
                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-400 rounded-sm"></div> Cement</span>
                        {/* <span className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-600 rounded-sm"></div> Forecast</span> */}
                    </div>
                </div>

                {/* Regional Insights */}
                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-blue-400" /> Regional Variance
                        </h3>
                        <div className="space-y-4">
                            {regionalAvgs.map((reg) => (
                                <div key={reg.region} className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-white">{reg.region}</span>
                                        {reg.cement < 108 ? <span className="text-xs bg-green-500/20 text-green-400 px-2 rounded">Cheapest</span> : null}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-slate-500 block text-xs">Cement</span>
                                            <span className="text-slate-300">R{reg.cement}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block text-xs">Bricks</span>
                                            <span className="text-slate-300">R{reg.bricks}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-6 bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-yellow-400/20 rounded-lg text-yellow-400">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-lg">Pro Tip</h4>
                                <p className="text-sm text-slate-300 mt-1">
                                    Buying <strong>Cement</strong> in KZN? Use local suppliers to save avg. <strong>R3.50 per bag</strong> vs national chains.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
