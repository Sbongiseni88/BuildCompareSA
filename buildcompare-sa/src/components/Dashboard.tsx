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
    Plus
} from 'lucide-react';
import { mockProjects, mockDashboardStats } from '@/data/mockData';

interface DashboardProps {
    onNavigateToProjects: () => void;
    onNavigateToCompare: () => void;
}

export default function Dashboard({ onNavigateToProjects, onNavigateToCompare }: DashboardProps) {
    const stats = [
        {
            label: 'Active Projects',
            value: mockDashboardStats.activeProjects,
            change: '+2',
            changeType: 'positive' as const,
            icon: FolderOpen,
            color: 'from-blue-500 to-blue-600',
        },
        {
            label: 'Total Savings',
            value: `R${(mockDashboardStats.totalSavings / 1000).toFixed(0)}K`,
            change: '+18.5%',
            changeType: 'positive' as const,
            icon: PiggyBank,
            color: 'from-green-500 to-emerald-600',
        },
        {
            label: 'Comparisons Today',
            value: mockDashboardStats.comparisonsToday,
            change: '+12',
            changeType: 'positive' as const,
            icon: Zap,
            color: 'from-yellow-500 to-orange-500',
        },
        {
            label: 'Avg. Savings',
            value: `${mockDashboardStats.averageSavingsPercent}%`,
            change: '+2.3%',
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'badge-success';
            case 'completed': return 'badge-info';
            case 'on-hold': return 'badge-warning';
            default: return 'badge-info';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Welcome Section */}
            <div className="glass-card p-6 industrial-pattern">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            Good morning, <span className="text-gradient">Sibongiseni</span> 👷
                        </h1>
                        <p className="text-slate-400 mt-1">
                            You have {mockDashboardStats.activeProjects} active projects. Let&apos;s find the best prices today!
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onNavigateToCompare}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Zap className="w-4 h-4" />
                            Quick Compare
                        </button>
                        <button
                            onClick={onNavigateToProjects}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Project
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="glass-card p-5 group hover:scale-[1.02] transition-transform duration-300"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className="flex items-start justify-between">
                                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div className={`flex items-center gap-1 text-sm font-medium ${stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                    {stat.changeType === 'positive' ? (
                                        <ArrowUpRight className="w-4 h-4" />
                                    ) : (
                                        <ArrowDownRight className="w-4 h-4" />
                                    )}
                                    {stat.change}
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                                <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Projects Section */}
            <div className="glass-card overflow-hidden">
                <div className="p-5 border-b border-slate-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Your Projects</h2>
                        <p className="text-sm text-slate-400">Track budgets and materials across all your sites</p>
                    </div>
                    <button
                        onClick={onNavigateToProjects}
                        className="text-yellow-400 hover:text-yellow-300 text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                        View All
                        <ArrowUpRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5">
                    <div className="grid gap-4">
                        {mockProjects.slice(0, 3).map((project, index) => {
                            const progressPercent = (project.spent / project.totalBudget) * 100;
                            const isOverBudget = progressPercent > 100;

                            return (
                                <div
                                    key={project.id}
                                    className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-yellow-500/30 transition-colors group cursor-pointer"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-semibold text-white group-hover:text-yellow-400 transition-colors">
                                                    {project.name}
                                                </h3>
                                                <span className={`badge ${getStatusColor(project.status)}`}>
                                                    {project.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    {project.location}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {new Date(project.createdAt).toLocaleDateString('en-ZA', {
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Budget Progress */}
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between text-sm mb-2">
                                            <span className="text-slate-400">Budget Used</span>
                                            <span className={`font-medium ${isOverBudget ? 'text-red-400' : 'text-white'}`}>
                                                {formatCurrency(project.spent)} / {formatCurrency(project.totalBudget)}
                                            </span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-bar-fill"
                                                style={{
                                                    width: `${Math.min(progressPercent, 100)}%`,
                                                    background: isOverBudget
                                                        ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                                        : progressPercent > 80
                                                            ? 'linear-gradient(90deg, #f97316, #ea580c)'
                                                            : 'linear-gradient(90deg, #facc15, #eab308)'
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                                            <span>{progressPercent.toFixed(0)}% spent</span>
                                            <span>{formatCurrency(project.totalBudget - project.spent)} remaining</span>
                                        </div>
                                    </div>

                                    {/* Materials Summary */}
                                    {project.materials.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-700">
                                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Materials</p>
                                            <div className="flex flex-wrap gap-2">
                                                {project.materials.slice(0, 3).map((material) => (
                                                    <span
                                                        key={material.id}
                                                        className="px-3 py-1 bg-slate-700/50 rounded-full text-xs text-slate-300"
                                                    >
                                                        {material.name.split(' ').slice(0, 2).join(' ')}
                                                    </span>
                                                ))}
                                                {project.materials.length > 3 && (
                                                    <span className="px-3 py-1 bg-yellow-500/20 rounded-full text-xs text-yellow-400">
                                                        +{project.materials.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={onNavigateToCompare}
                    className="glass-card p-5 text-left group hover:border-yellow-500/50 transition-all duration-300"
                >
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Zap className="w-6 h-6 text-slate-900" />
                    </div>
                    <h3 className="font-semibold text-white mb-1">Quick Price Check</h3>
                    <p className="text-sm text-slate-400">Search and compare prices instantly</p>
                </button>

                <button className="glass-card p-5 text-left group hover:border-green-500/50 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-white mb-1">Price Alerts</h3>
                    <p className="text-sm text-slate-400">Get notified when prices drop</p>
                </button>

                <button className="glass-card p-5 text-left group hover:border-blue-500/50 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <FolderOpen className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-white mb-1">Bulk Order</h3>
                    <p className="text-sm text-slate-400">Request quotes for large orders</p>
                </button>
            </div>
        </div>
    );
}
