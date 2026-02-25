"use client";

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
    pullDistance: number;
    isRefreshing: boolean;
    progress: number;
}

export default function PullToRefreshIndicator({ pullDistance, isRefreshing, progress }: PullToRefreshIndicatorProps) {
    if (pullDistance <= 0 && !isRefreshing) return null;

    return (
        <div
            className="flex items-center justify-center overflow-hidden transition-all"
            style={{ height: `${Math.max(pullDistance, isRefreshing ? 48 : 0)}px` }}
        >
            <div className={`flex items-center gap-2 text-sm ${progress >= 1 || isRefreshing ? 'text-yellow-400' : 'text-slate-500'}`}>
                <RefreshCw
                    className={`w-5 h-5 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
                    style={{ transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)` }}
                />
                <span className="font-medium text-xs">
                    {isRefreshing ? 'Refreshing...' : progress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
                </span>
            </div>
        </div>
    );
}
