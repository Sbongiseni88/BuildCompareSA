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
    HardHat,
    User
} from 'lucide-react';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    isCollapsed: boolean;
    isMobileOpen: boolean;
    onMobileClose: () => void;
}

export default function Sidebar({ activeTab, onTabChange, isCollapsed, isMobileOpen, onMobileClose }: SidebarProps) {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'estimator', label: 'Smart Estimator', icon: Calculator },
        { id: 'compare', label: 'Price Search', icon: Search },
        { id: 'projects', label: 'Projects Hub', icon: FolderOpen },
        { id: 'cost-analysis', label: 'Cost Analysis', icon: PieChart },
    ];

    const bottomItems = [
        { id: 'account', label: 'Account', icon: User },
        { id: 'sign-out', label: 'Sign Out', icon: LogOut },
    ];

    const handleItemClick = (id: string) => {
        onTabChange(id);
        if (window.innerWidth < 1024) {
            onMobileClose();
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
                    onClick={onMobileClose}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 lg:sticky top-0 h-[100dvh] bg-black border-r border-slate-800 flex flex-col z-[60] flex-shrink-0 transition-all duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}
            >
                {/* Logo Area (Static) */}
                <div className={`p-6 flex items-center flex-shrink-0 ${isCollapsed ? 'lg:justify-center' : 'gap-3'} transition-all`}>
                    <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center flex-shrink-0">
                        <HardHat className="w-5 h-5 text-black" />
                    </div>
                    {(!isCollapsed || isMobileOpen) && (
                        <h1 className="text-xl font-bold text-white tracking-tight whitespace-nowrap overflow-hidden animate-fade-in group">
                            BUILD<span className="text-yellow-400">COMPARE</span>
                        </h1>
                    )}
                </div>

                {/* Main Menu (Scrollable) */}
                <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto min-h-0">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleItemClick(item.id)}
                                title={isCollapsed ? item.label : ''}
                                className={`w-full flex items-center ${isCollapsed ? 'lg:justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive
                                    ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                    }`}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {(!isCollapsed || isMobileOpen) && (
                                    <span className="whitespace-nowrap overflow-hidden animate-fade-in">{item.label}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Bottom Menu (Static - Anchored) */}
                <div className="p-4 border-t border-slate-900 space-y-2 flex-shrink-0 pb-8 lg:pb-4">
                    {bottomItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleItemClick(item.id)}
                                title={isCollapsed ? item.label : ''}
                                className={`w-full flex items-center ${isCollapsed ? 'lg:justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive
                                    ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                                    : 'text-slate-500 hover:text-white hover:bg-slate-900'
                                    }`}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {(!isCollapsed || isMobileOpen) && (
                                    <span className="whitespace-nowrap overflow-hidden animate-fade-in">{item.label}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </aside>
        </>
    );
}
