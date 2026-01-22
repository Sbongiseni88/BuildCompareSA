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
    BarChart3
} from 'lucide-react';
import MarketTicker from './MarketTicker';
import { createClient } from '@/utils/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Project } from '@/types';

interface DashboardProps {
    onNavigateToProjects: () => void;
    onNavigateToCompare: () => void;
}

export default function Dashboard({ onNavigateToProjects, onNavigateToCompare }: DashboardProps) {
    const { user, loading: authLoading } = useAuthContext();
    const supabase = createClient();
    const [projects, setProjects] = React.useState<Project[]>([]);
    const [dataLoading, setDataLoading] = React.useState(false);

    React.useEffect(() => {
        // If auth is global loading, do nothing yet
        if (authLoading) return;

        // If no user, we can't fetch. Just stop.
        if (!user) return;

        const fetchDashboardData = async () => {
            setDataLoading(true);
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('*, project_materials(*)')
                    .order('created_at', { ascending: false })
                    .limit(5);

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
                            category: m.category
                        }))
                    }));
                    setProjects(mappedProjects);
                }
            } catch (e) {
                console.error("Dashboard fetch error:", e);
                // Optionally show toast error
            } finally {
                setDataLoading(false);
            }
        };

        fetchDashboardData();
    }, [user, authLoading]);

    // Derived Stats
    const activeCount = projects.filter(p => p.status === 'active').length;

    // Stats Array
    const stats = [
        {
            label: 'Active Projects',
            value: activeCount,
            change: '',
            changeType: 'positive' as const,
            icon: FolderOpen,
            color: 'from-blue-500 to-blue-600',
        },
        {
            label: 'Total Savings',
            value: `R0`,
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

    // Global loading state (Auth or Data)
    if (authLoading || (dataLoading && projects.length === 0)) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-400">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* 1. Market Ticker - Full Width */}
            <div className="-mx-8 -mt-8 mb-8">
                <MarketTicker />
            </div>

            {/* 2. Welcome Section */}
            <div className="glass-card p-6 industrial-pattern rounded-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">
                            Good morning, <span className="text-gradient">Builder</span> 👷
                        </h1>
                        <p className="text-slate-400 mt-2 text-lg">
                            You have <span className="text-white font-bold">{activeCount} active projects</span>. Let's get to work!
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onNavigateToCompare}
                            className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl shadow-lg shadow-yellow-400/20 text-sm flex items-center gap-2 hover:scale-105 transition-all"
                        >
                            <Zap className="w-4 h-4" />
                            Quick Compare
                        </button>
                        <button
                            onClick={onNavigateToProjects}
                            className="px-6 py-3 bg-transparent border-2 border-slate-700 hover:border-white text-white font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-white/5 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            New Project
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
                                <p className="text-3xl font-black text-white tracking-tight">{stat.value}</p>
                                <p className="text-sm text-slate-400 font-medium mt-1">{stat.label}</p>
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
                            Active Projects
                        </h2>
                        <button onClick={onNavigateToProjects} className="text-sm text-slate-400 hover:text-yellow-400 font-medium transition-colors">
                            View All Projects →
                        </button>
                    </div>

                    <div className="grid gap-4">
                        {projects.length > 0 ? (
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
                            <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl text-center">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FolderOpen className="w-8 h-8 text-slate-500" />
                                </div>
                                <h3 className="text-white font-bold mb-2">No Projects Yet</h3>
                                <p className="text-slate-400 mb-6 text-sm">Create your first project to start tracking costs.</p>
                                <button onClick={onNavigateToProjects} className="btn-primary flex items-center gap-2 mx-auto">
                                    <Plus className="w-4 h-4" /> Create Project
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. Cost Visuals (Right 1/3) */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-purple-500" />
                        Spend Analysis
                    </h2>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-50">
                            <BarChart3 className="w-32 h-32 text-slate-800/50" />
                        </div>

                        <div className="relative z-10">
                            <h3 className="text-slate-300 font-medium mb-6">Total Spend Distribution</h3>

                            {/* Simple CSS Chart */}
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-white">Materials</span>
                                        <span className="text-blue-400">65%</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-[65%] rounded-full"></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-white">Labor</span>
                                        <span className="text-green-400">25%</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 w-[25%] rounded-full"></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-white">Logistics</span>
                                        <span className="text-purple-400">10%</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 w-[10%] rounded-full"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-800 rounded-lg">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Next Scheduled Delivery</p>
                                        <p className="text-sm font-bold text-white">Tomorrow, 9:00 AM</p>
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
                            className="w-full py-2 bg-white text-black font-bold rounded-lg shadow-lg hover:bg-slate-100 transition-colors text-sm"
                        >
                            Check Prices
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
