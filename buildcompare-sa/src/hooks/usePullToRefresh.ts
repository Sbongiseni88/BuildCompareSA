"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
    onRefresh: () => Promise<void>;
    threshold?: number; // pixels to pull before triggering
}

export default function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
    const [isPulling, setIsPulling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const startY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        // Only trigger when scrolled to top
        const el = containerRef.current;
        if (!el || el.scrollTop > 0) return;
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isPulling || isRefreshing) return;
        const el = containerRef.current;
        if (!el || el.scrollTop > 0) {
            setIsPulling(false);
            setPullDistance(0);
            return;
        }
        const currentY = e.touches[0].clientY;
        const diff = Math.max(0, currentY - startY.current);
        // Apply resistance — diminishing returns past threshold
        const distance = diff > threshold ? threshold + (diff - threshold) * 0.3 : diff;
        setPullDistance(distance);
        if (distance > 10) {
            e.preventDefault();
        }
    }, [isPulling, isRefreshing, threshold]);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling) return;
        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(threshold); // Lock at threshold during refresh
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        }
        setIsPulling(false);
        setPullDistance(0);
    }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd, { passive: true });
        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    const progress = Math.min(pullDistance / threshold, 1);

    return { containerRef, isPulling, isRefreshing, pullDistance, progress };
}
