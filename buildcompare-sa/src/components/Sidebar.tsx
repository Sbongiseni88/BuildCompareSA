"use client";

import React from 'react';
import {
    LayoutDashboard,
    Calculator,
    Search,
    FolderOpen,
    PieChart,
    Settings,
    LogOut,
    HardHat
} from 'lucide-react';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'estimator', label: 'Smart Estimator', icon: Calculator },
        { id: 'compare', label: 'Price Search', icon: Search },
        { id: 'projects', label: 'Projects Hub', icon: FolderOpen },
        { id: 'cost-analysis', label: 'Cost Analysis', icon: PieChart },
    ];

    const bottomItems = [
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'sign-out', label: 'Sign Out', icon: LogOut },
    ];

    return (
        <aside className="sticky top-0 h-screen w-64 bg-black border-r border-slate-800 flex flex-col z-50 flex-shrink-0">
            {/* Logo Area */}
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                    <HardHat className="w-5 h-5 text-black" />
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                    BUILD<span className="text-yellow-400">COMPARE</span>
                </h1>
            </div>

            {/* Main Menu */}
            <div className="flex-1 px-4 py-4 space-y-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive
                                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* Bottom Menu */}
            <div className="p-4 border-t border-slate-900 space-y-2">
                {bottomItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-white hover:bg-slate-900 transition-colors font-medium"
                        >
                            <Icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
