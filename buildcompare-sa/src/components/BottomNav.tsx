"use client";

import React from 'react';
import {
    LayoutDashboard,
    Calculator,
    Search,
    FolderOpen,
    User,
} from 'lucide-react';

interface BottomNavProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'estimator', label: 'Estimate', icon: Calculator },
    { id: 'compare', label: 'Search', icon: Search },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'account', label: 'Account', icon: User },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-slate-800 bg-black/90 backdrop-blur-xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`
                                flex flex-col items-center justify-center gap-0.5 w-full h-full
                                transition-all duration-200 relative group
                                ${isActive
                                    ? 'text-yellow-400'
                                    : 'text-slate-500 active:text-slate-300'
                                }
                            `}
                        >
                            {/* Active indicator dot */}
                            {isActive && (
                                <span className="absolute -top-0.5 w-5 h-0.5 bg-yellow-400 rounded-full" />
                            )}
                            <Icon
                                className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-active:scale-95'
                                    }`}
                            />
                            <span
                                className={`text-[10px] font-bold tracking-tight ${isActive ? 'text-yellow-400' : ''
                                    }`}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
