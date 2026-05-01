"use client";

import React from 'react';
import {
    TrendingUp,
    FolderOpen,
    Zap,
    PiggyBank,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    MapPin,
    MoreHorizontal,
    Plus,
    PieChart,
    BarChart3,
    Search,
    Calculator,
    Info,
    PlayCircle,
    BookOpen,
    MessageCircle,
} from 'lucide-react';
import MarketTicker from './MarketTicker';
import { StatsSkeleton, ProjectCardSkeleton, SpendAnalysisSkeleton } from './SkeletonLoader';
import { createClient } from '@/utils/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Project } from '@/types';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';
import { useToast } from '@/contexts/ToastContext';

interface DashboardProps {
    onNavigateToProjects: () => void;
    onNavigateToCompare: () => void;
}

export default function Dashboard({ onNavigateToProjects, onNavigateToCompare }: DashboardProps) {
    const { user, userProfile, loading: authLoading } = useAuthContext();
    const { showInfo } = useToast();
    const supabaseRef = React.useRef(createClient());
    const supabase = supabaseRef.current;
    const [projects, setProjects] = React.useState<Project[]>([]);
    const [dataLoading, setDataLoading] = React.useState(false);
    const [dataReady, setDataReady] = React.useState(false);
    const [fetchError, setFetchError] = React.useState<string | null>(null);
    const abortControllerRef = React.useRef<AbortController | null>(null);

    const fetchDashboardData = React.useCallback(async () => {
        if (!user) return;
        
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setDataLoading(true);
        setFetchError(null);

        const timer = setTimeout(() => {
            abortController.abort(new Error("Connection timed out. Please check your internet."));
        }, 6000);

        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*, project_materials(*)')
                .order('created_at', { ascending: false })
                .limit(5)
                .abortSignal(abortController.signal);

            clearTimeout(timer);
            if (error) throw error;

            if (data) {
                const mappedProjects: Project[] = data.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    location: p.location || '',
                    createdAt: new Date(p.created_at),
                    totalBudget: Number(p.total_budget),
                    spent: Number(p.spent),
                    status: p.status,
                    materials: (p.project_materials || []).map((m: any) => ({
                        id: m.id,
                        name: m.name,
                        quantity: Number(m.quantity),
                        unit: m.unit,
                        category: m.category,
                        laborCostEstimate: Number(m.laborCostEstimate || 0),
                        _aiPriceEstimate: Number(m.price || 0) // or whatever field tracks price
                    }))
                }));
                setProjects(mappedProjects);
            }
        } catch (e: any) {
            clearTimeout(timer);
            if (e.name !== 'AbortError') {
                console.error("Dashboard fetch error:", e);
                setFetchError(e.message || "Failed to load dashboard data");
            } else {
                setFetchError("Connection timed out. Please check your internet.");
            }
        } finally {
            setDataLoading(false);
            setDataReady(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, supabase]);

    React.useEffect(() => {
        if (authLoading) return;
        if (!user?.id) {
            // Auth resolved but no user — mark ready immediately so we don't shimmer
            setDataReady(true);
            setDataLoading(false);
            return;
        }
        fetchDashboardData();
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, authLoading]);

    // Hard failsafe: if data loading takes >8s, force-stop the shimmer
    React.useEffect(() => {
        if (!dataLoading) return;
        const hardTimeout = setTimeout(() => {
            console.warn('⚠️ Dashboard: data loading exceeded 8s hard limit. Forcing render.');
            setDataLoading(false);
            setDataReady(true);
            if (!fetchError) setFetchError('Loading took too long. Tap "Try Again" to retry.');
        }, 8000);
        return () => clearTimeout(hardTimeout);
    }, [dataLoading, fetchError]);

    const { containerRef, isRefreshing, pullDistance, progress } = usePullToRefresh({
        onRefresh: fetchDashboardData,
    });

    // Derived Stats
    const activeCount = projects.filter(p => p.status === 'active').length;
    const totalSavingsValue = projects.reduce((acc, p) => {
        const savings = p.totalBudget - p.spent;
        return savings > 0 ? acc + savings : acc;
    }, 0);

    // Display name
    const displayName = userProfile?.displayName || 'Builder';
    const greeting = getGreeting();

    // Stats Array
    const stats = [
        {
            label: 'Active Job Folders',
            value: activeCount,
            change: '',
            changeType: 'positive' as const,
            icon: FolderOpen,
            color: 'from-blue-500 to-blue-600',
        },
        {
            label: 'Total Savings',
            value: `R${totalSavingsValue.toLocaleString('en-ZA')}`,
            change: '',
            changeType: 'positive' as const,
            icon: PiggyBank,
            color: 'from-green-500 to-emerald-600',
        },
        {
            label: 'Comparisons Today',
            value: 0,
            change: '',
            changeType: 'positive' as const,
            icon: Zap,
            color: 'from-yellow-500 to-orange-500',
        },
        {
            label: 'Avg. Savings',
            value: `0%`,
            change: '',
            changeType: 'positive' as const,
            icon: TrendingUp,
            color: 'from-purple-500 to-pink-500',
        },
    ];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Skeleton loading state — only show if auth is still resolving OR data hasn't been fetched yet
    const isLoading = authLoading || (!dataReady && !fetchError);

    if (isLoading) {
        return (
            <div className="space-y-8 animate-fade-in pb-20">
                {/* Market Ticker */}
                <div className="-mx-4 md:-mx-8 -mt-4 md:-mt-8 mb-8">
                    <MarketTicker />
                </div>

                {/* Accessible loading message instead of silent shimmer */}
                <div className="glass-card p-8 rounded-2xl text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-14 h-14 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                        <h2 className="text-2xl font-bold text-white">Loading Your Sites...</h2>
                        <p className="text-lg text-slate-300">Connecting to your project data. This should only take a moment.</p>
                    </div>
                </div>

                {/* Stats Skeleton */}
                <StatsSkeleton />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="h-6 w-40 bg-slate-800 rounded-lg" />
                            <div className="h-4 w-32 bg-slate-800 rounded-lg" />
                        </div>
                        <div className="grid gap-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <ProjectCardSkeleton key={i} />
                            ))}
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="h-6 w-36 bg-slate-800 rounded-lg" />
                        <SpendAnalysisSkeleton />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="space-y-8 animate-fade-in pb-20 overflow-auto">
            {/* Pull-to-refresh indicator */}
            <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} progress={progress} />
            {/* 1. Market Ticker - Full Width */}
            <div className="-mx-4 md:-mx-8 -mt-4 md:-mt-8 mb-8">
                <MarketTicker />
            </div>

            {/* 2. Welcome Section */}
            <div className="glass-card p-6 industrial-pattern rounded-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">
                            {greeting}, <span className="text-gradient">{displayName}</span> 👷
                        </h1>
                        <p className="text-slate-400 mt-2 text-lg">
                            {projects.length === 0 ? (
                                <>Welcome! Get started by comparing prices or creating your first job folder.</>
                            ) : (
                                <>You have <span className="text-white font-bold">{activeCount} active job folder{activeCount !== 1 ? 's' : ''}</span>. Let&apos;s get to work!</>
                            )}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
                        <button
                            onClick={onNavigateToCompare}
                            className="px-6 py-3 min-h-[56px] bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl shadow-lg shadow-yellow-400/20 text-sm flex items-center justify-center gap-2 hover:scale-105 transition-all w-full md:w-auto"
                        >
                            <Zap className="w-5 h-5" />
                            Find Best Prices
                        </button>
                        <button
                            onClick={onNavigateToProjects}
                            className="px-6 py-3 min-h-[56px] bg-transparent border-2 border-slate-700 hover:border-white text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-white/5 transition-all w-full md:w-auto"
                        >
                            <Plus className="w-5 h-5" />
                            Create a New Job
                        </button>
                    </div>
                </div>

                {/* Decorative Background Elements */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-yellow-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            </div>

            {/* 3. Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl group hover:border-yellow-500/30 hover:bg-slate-800/80 transition-all duration-300 backdrop-blur-sm"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className="flex items-start justify-between">
                                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                {stat.change && (
                                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-slate-950/50 border border-slate-800 ${stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        <ArrowUpRight className="w-3 h-3" />
                                        {stat.change}
                                    </div>
                                )}
                            </div>
                            <div className="mt-4">
                                <p className="text-[2.25rem] leading-none font-black text-white tracking-tight">{stat.value}</p>
                                <p className="text-sm text-slate-400 font-medium mt-2">{stat.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 4. Main Projects Area (Left 2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <FolderOpen className="w-5 h-5 text-yellow-500" />
                            My Job Folders
                        </h2>
                        <button onClick={onNavigateToProjects} className="text-sm min-h-[56px] flex items-center px-4 -mr-4 text-slate-400 hover:text-yellow-400 font-medium transition-colors">
                            View All Folders →
                        </button>
                    </div>

                    <div className="grid gap-4">
                        {fetchError ? (
                            <div className="p-10 bg-slate-900/50 border border-red-500/30 rounded-2xl text-center">
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <TrendingUp className="w-8 h-8 text-red-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Connection Issue</h3>
                                <p className="text-slate-400 mb-6 text-sm max-w-xs mx-auto">
                                    {fetchError}
                                </p>
                                <button onClick={fetchDashboardData} className="btn-primary">
                                    Try Again
                                </button>
                            </div>
                        ) : projects.length > 0 ? (
                            projects.slice(0, 3).map((project, index) => {
                                const progressPercent = project.totalBudget > 0 ? (project.spent / project.totalBudget) * 100 : 0;
                                const isOverBudget = progressPercent > 100;

                                return (
                                    <div
                                        key={project.id}
                                        className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-600 transition-all duration-300 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                                        <div className="relative z-10">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">
                                                        {project.name}
                                                    </h3>
                                                    <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" /> {project.location}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${project.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-300'
                                                            }`}>
                                                            {project.status}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Remaining</p>
                                                    <p className="text-white font-bold">{formatCurrency(project.totalBudget - project.spent)}</p>
                                                </div>
                                            </div>

                                            {/* Cost Bar */}
                                            <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
                                                {/* Base Progress */}
                                                <div
                                                    className={`absolute top-0 bottom-0 left-0 rounded-full transition-all duration-1000 ${isOverBudget ? 'bg-red-500' : 'bg-gradient-to-r from-yellow-500 to-yellow-300'
                                                        }`}
                                                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                                ></div>
                                            </div>

                                            {/* Micro Stats */}
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400">
                                                    Spent: <span className="text-white font-medium">{formatCurrency(project.spent)}</span>
                                                </span>
                                                <span className={isOverBudget ? 'text-red-400 font-bold' : 'text-slate-400'}>
                                                    {progressPercent.toFixed(1)}% of Budget
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            /* Empty State - Refactored for 40+ */
                            <div className="p-10 bg-slate-900/50 border border-dashed border-slate-700 rounded-2xl text-center transition-all hover:border-yellow-500/30">
                                <div className="w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-2xl flex items-center justify-center mx-auto mb-5 animate-float">
                                    <FolderOpen className="w-10 h-10 text-yellow-500" />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2">Step 1: Create Your First Job</h3>
                                <p className="text-slate-400 mb-8 text-lg max-w-sm mx-auto leading-relaxed">
                                    Track materials, budgets, and savings across all your sites. Get started by setting up a job folder.
                                </p>
                                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                                    <button onClick={onNavigateToProjects} className="btn-primary flex items-center justify-center gap-2 min-h-[56px] w-full sm:w-auto px-8 text-lg font-bold">
                                        <Plus className="w-5 h-5" /> Create a Folder
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. Cost Visuals (Right 1/3) */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-purple-500" />
                        Your Budget Tracker
                        <span className="tooltip-trigger ml-1">
                            <Info className="w-4 h-4 text-slate-600 cursor-help" />
                            <span className="tooltip-content">A clear view of where your money is going across your construction jobs.</span>
                        </span>
                    </h2>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-50">
                            <BarChart3 className="w-32 h-32 text-slate-800/50" />
                        </div>

                        <div className="relative z-10">
                            <h3 className="text-slate-300 font-medium mb-6">Where Your Money Goes</h3>

                            {/* Dynamically Styled CSS Chart for Material vs Labour */}
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-base mb-2">
                                        <span className="text-white font-bold flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div> Material Costs
                                        </span>
                                        <span className="text-blue-400 font-bold">65%</span>
                                    </div>
                                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-[65%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-base mb-2">
                                        <span className="text-white font-bold flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-green-500"></div> Labour Estimates
                                        </span>
                                        <span className="text-green-400 font-bold">35%</span>
                                    </div>
                                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 w-[35%] rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-slate-800 rounded-xl">
                                        <TrendingUp className="w-5 h-5 text-yellow-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400">Budget Health</p>
                                        <p className="text-base font-bold text-white">On Track</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Material Actions */}
                    <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 text-slate-900">
                        <h3 className="font-bold text-lg mb-2">Need Cement?</h3>
                        <p className="text-sm font-medium opacity-80 mb-4">Prices dropped at Builders Warehouse today.</p>
                        <button
                            onClick={onNavigateToCompare}
                            className="w-full py-3 min-h-[56px] bg-white text-black font-bold rounded-lg shadow-lg hover:bg-slate-100 transition-colors text-base flex items-center justify-center"
                        >
                            Check Prices
                        </button>
                    </div>
                </div>
            </div>

            {/* 6. Builder's Toolkit & Tutorials */}
            <div className="mt-12 border-t border-slate-800 pt-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-blue-400" />
                        Builder's Toolkit & Tutorials
                    </h2>
                    
                    <a 
                        href="https://wa.me/27820000000?text=Howzit%20Sibongiseni%2C%20I%20need%20help%20with%20my%20project%20on%20BuildCompare" 
                        target="_blank" 
                        rel="noreferrer"
                        className="hidden md:flex items-center gap-2 min-h-[56px] px-6 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all hover:scale-105"
                    >
                        <MessageCircle className="w-5 h-5" />
                        Gauteng WhatsApp Support
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1 */}
                    <div 
                        onClick={() => showInfo("This tutorial is being updated for 2026 standards—coming soon!")}
                        className="group cursor-pointer bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10"
                    >
                        <div className="h-40 bg-gradient-to-br from-blue-900/40 to-slate-900 relative flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-10"></div>
                            <PlayCircle className="w-16 h-16 text-blue-400 group-hover:scale-110 transition-transform drop-shadow-lg" />
                        </div>
                        <div className="p-5">
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 block">Quick Video</span>
                            <h3 className="text-lg font-bold text-white mb-2">How to Upload a BoQ</h3>
                            <p className="text-slate-400 text-sm">Learn how to instantly extract materials from any Excel or PDF document.</p>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div 
                        onClick={() => showInfo("This tutorial is being updated for 2026 standards—coming soon!")}
                        className="group cursor-pointer bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-yellow-500/50 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-500/10"
                    >
                        <div className="h-40 bg-gradient-to-br from-yellow-900/40 to-slate-900 relative flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-10"></div>
                            <BookOpen className="w-16 h-16 text-yellow-500 group-hover:scale-110 transition-transform drop-shadow-lg" />
                        </div>
                        <div className="p-5">
                            <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-2 block">Simple Guide</span>
                            <h3 className="text-lg font-bold text-white mb-2">Understanding SANS 10400</h3>
                            <p className="text-slate-400 text-sm">A practical breakdown of standard South African building regulations for your site.</p>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div 
                        onClick={() => showInfo("This tutorial is being updated for 2026 standards—coming soon!")}
                        className="group cursor-pointer bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-green-500/50 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/10"
                    >
                        <div className="h-40 bg-gradient-to-br from-green-900/40 to-slate-900 relative flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-10"></div>
                            <TrendingUp className="w-16 h-16 text-green-400 group-hover:scale-110 transition-transform drop-shadow-lg" />
                        </div>
                        <div className="p-5">
                            <span className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2 block">Pro Tip</span>
                            <h3 className="text-lg font-bold text-white mb-2">Managing Your Labour Budget</h3>
                            <p className="text-slate-400 text-sm">How to use the new SANS-aligned labour engine to keep your quotes realistic.</p>
                        </div>
                    </div>
                </div>
                
                {/* Mobile WhatsApp Button */}
                <a 
                    href="https://wa.me/27820000000?text=Howzit%20Sibongiseni%2C%20I%20need%20help%20with%20my%20project%20on%20BuildCompare" 
                    target="_blank" 
                    rel="noreferrer"
                    className="md:hidden mt-6 flex w-full items-center justify-center gap-2 min-h-[56px] px-6 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                    <MessageCircle className="w-5 h-5" />
                    Gauteng WhatsApp Support
                </a>
            </div>
        </div>
    );
}

/** Returns a time-appropriate greeting */
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}
