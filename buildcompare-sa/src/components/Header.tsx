"use client";

import React, { useState } from 'react';
import {
    HardHat,
    Search,
    Bell,
    Menu,
    X,
    FolderOpen,
    BarChart3,
    Settings,
    LogOut,
    ChevronDown,
    Zap,
    Calculator
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface HeaderProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const { user, userProfile } = useAuthContext();
    const supabase = createClient();

    React.useEffect(() => {
        if (!user) return;

        const fetchUnreadCount = async () => {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('read', false);
            
            if (!error && count !== null) {
                setUnreadCount(count);
            }
        };

        fetchUnreadCount();

        const channel = supabase
            .channel('header_notifications')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            }, () => {
                fetchUnreadCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, supabase]);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'estimator', label: 'Estimator', icon: Calculator },
        { id: 'compare', label: 'Price Compare', icon: Search },
        { id: 'projects', label: 'Projects', icon: FolderOpen },
    ];

    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-yellow-500/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse-glow">
                                <HardHat className="w-6 h-6 text-slate-900" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></div>
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-bold text-gradient">BuildCompare</h1>
                            <p className="text-xs text-slate-400 -mt-1">South Africa</p>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onTabChange(item.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${isActive
                                        ? 'bg-yellow-500/20 text-yellow-400 shadow-lg shadow-yellow-500/10'
                                        : 'text-slate-300 hover:text-yellow-400 hover:bg-slate-800/50'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Right Section */}
                    <div className="flex items-center gap-3">
                        {/* Quick Search */}
                        <div className="hidden lg:flex items-center bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700 focus-within:border-yellow-500/50 transition-colors">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Quick search..."
                                className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 ml-2 w-40"
                            />
                            <kbd className="hidden xl:inline-block px-2 py-0.5 text-xs text-slate-500 bg-slate-700/50 rounded">⌘K</kbd>
                        </div>

                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setNotificationsOpen(!notificationsOpen)}
                                className="relative p-2 text-slate-400 hover:text-yellow-400 transition-colors rounded-lg hover:bg-slate-800/50"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown (Delegated to global NotificationCenter instead of showing it here if it's rendered by page.tsx, but we'll leave the trigger button logic as is. Since NotificationCenter handles it now, let's just make the bell trigger onTabChange or not render the demo here.) */}
                            {notificationsOpen && (
                                <div className="absolute right-0 mt-2 w-80 glass-card rounded-xl shadow-2xl overflow-hidden animate-slide-up p-4">
                                    <p className="text-sm text-slate-300">Click the main Bell icon in the dashboard to view notifications.</p>
                                </div>
                            )}
                        </div>

                        {/* Profile */}
                        <div className="relative">
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/50 transition-colors"
                            >
                                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center text-slate-900 font-bold text-sm">
                                    JM
                                </div>
                                <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                            </button>

                            {/* Profile Dropdown */}
                            {profileOpen && (
                                <div className="absolute right-0 mt-2 w-56 glass-card rounded-xl shadow-2xl overflow-hidden animate-slide-up">
                                    <div className="p-4 border-b border-slate-700">
                                        <p className="font-semibold text-slate-200">Sibongiseni</p>
                                        <p className="text-xs text-slate-400">sibongiseni@buildcompare.co.za</p>
                                        <div className="flex items-center gap-1 mt-2">
                                            <Zap className="w-3 h-3 text-yellow-400" />
                                            <span className="text-xs text-yellow-400 font-medium">Pro Contractor</span>
                                        </div>
                                    </div>
                                    <div className="p-2">
                                        <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors text-sm">
                                            <Settings className="w-4 h-4" />
                                            Settings
                                        </button>
                                        <button className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm">
                                            <LogOut className="w-4 h-4" />
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-slate-400 hover:text-yellow-400 transition-colors"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-slate-700 animate-slide-up">
                        <nav className="flex flex-col gap-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            onTabChange(item.id);
                                            setMobileMenuOpen(false);
                                        }}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${isActive
                                            ? 'bg-yellow-500/20 text-yellow-400'
                                            : 'text-slate-300 hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}
