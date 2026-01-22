"use client";

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const marketData = [
    { item: 'Cement 42.5N', price: 109.50, change: -2.3 },
    { item: 'Y12 Rebar', price: 115.00, change: 1.2 },
    { item: 'Stock Bricks (1000)', price: 3200, change: 0.5 },
    { item: 'Copper Pipe 15mm', price: 285.00, change: -5.1 },
    { item: 'Roof Paint 20L', price: 1850, change: 0.0 },
    { item: 'RhinoBoard 3.6m', price: 210.00, change: 3.4 },
];

export default function MarketTicker() {
    return (
        <div className="w-full bg-slate-900 border-b border-slate-800 overflow-hidden py-2 relative flex items-center">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-slate-900 to-transparent z-10"></div>
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-900 to-transparent z-10"></div>

            <div className="flex gap-12 whitespace-nowrap animate-marquee">
                {/* Repeat list twice for smooth loop */}
                {[...marketData, ...marketData, ...marketData].map((data, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-slate-300">{data.item}</span>
                        <span className="text-white">R{data.price.toFixed(2)}</span>
                        <span className={`flex items-center text-xs ${data.change > 0 ? 'text-red-400' : data.change < 0 ? 'text-green-400' : 'text-slate-500'
                            }`}>
                            {data.change > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> :
                                data.change < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> :
                                    <Minus className="w-3 h-3 mr-1" />}
                            {Math.abs(data.change)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
