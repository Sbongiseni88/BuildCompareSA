"use client";

import React from 'react';

/** A single shimmer bar */
function SkeletonBar({ className = '' }: { className?: string }) {
    return (
        <div className={`relative overflow-hidden bg-slate-800 rounded-lg ${className}`}>
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
        </div>
    );
}

/** Skeleton for stats cards grid */
export function StatsSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <div className="flex items-start justify-between">
                        <SkeletonBar className="w-12 h-12 rounded-xl" />
                        <SkeletonBar className="w-16 h-6 rounded-full" />
                    </div>
                    <div className="space-y-2">
                        <SkeletonBar className="w-24 h-8" />
                        <SkeletonBar className="w-32 h-4" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Skeleton for a project card */
export function ProjectCardSkeleton() {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                    <SkeletonBar className="w-48 h-5" />
                    <div className="flex items-center gap-3">
                        <SkeletonBar className="w-24 h-4" />
                        <SkeletonBar className="w-16 h-4 rounded-full" />
                    </div>
                </div>
                <div className="space-y-1 text-right">
                    <SkeletonBar className="w-16 h-3" />
                    <SkeletonBar className="w-20 h-5" />
                </div>
            </div>
            <SkeletonBar className="w-full h-3 rounded-full" />
            <div className="flex justify-between">
                <SkeletonBar className="w-28 h-3" />
                <SkeletonBar className="w-20 h-3" />
            </div>
        </div>
    );
}

/** Skeleton for the welcome banner */
export function WelcomeSkeleton() {
    return (
        <div className="glass-card p-6 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-3">
                    <SkeletonBar className="w-72 h-8" />
                    <SkeletonBar className="w-56 h-5" />
                </div>
                <div className="flex gap-3">
                    <SkeletonBar className="w-36 h-12 rounded-xl" />
                    <SkeletonBar className="w-36 h-12 rounded-xl" />
                </div>
            </div>
        </div>
    );
}

/** Skeleton for sidebar spend analysis */
export function SpendAnalysisSkeleton() {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <SkeletonBar className="w-48 h-5" />
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="flex justify-between">
                            <SkeletonBar className="w-20 h-4" />
                            <SkeletonBar className="w-10 h-4" />
                        </div>
                        <SkeletonBar className="w-full h-2 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Skeleton for search results */
export function SearchResultsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-black/20 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <SkeletonBar className="w-10 h-10 rounded-lg" />
                            <div className="space-y-2 flex-1">
                                <SkeletonBar className="w-36 h-4" />
                                <SkeletonBar className="w-24 h-3" />
                            </div>
                        </div>
                    </div>
                    <div className="p-4 space-y-3">
                        <SkeletonBar className="w-16 h-5 rounded-full" />
                        <SkeletonBar className="w-28 h-7" />
                        <SkeletonBar className="w-20 h-3" />
                    </div>
                    <div className="p-3 space-y-2">
                        {Array.from({ length: 2 }).map((_, j) => (
                            <div key={j} className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <SkeletonBar className="w-8 h-8 rounded-lg" />
                                    <SkeletonBar className="w-24 h-4" />
                                </div>
                                <SkeletonBar className="w-16 h-4" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export { SkeletonBar };
export default SkeletonBar;
