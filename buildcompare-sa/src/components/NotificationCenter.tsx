"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bell, TrendingDown, AlertTriangle, Package, Settings, Check, X, Trash2 } from 'lucide-react';

interface NotificationItem {
    id: string;
    type: 'price_alert' | 'budget_warning' | 'system' | 'stock_alert';
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
}

const STORAGE_KEY = 'buildcompare_notifications';

// Seeded notifications so new users see something on first load
const seedNotifications: NotificationItem[] = [
    {
        id: 'n1',
        type: 'price_alert',
        title: 'Cement Price Drop!',
        message: 'PPC Cement 42.5N has dropped 8% at Builders Warehouse this week.',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    },
    {
        id: 'n2',
        type: 'budget_warning',
        title: 'Budget Alert',
        message: 'Your "Midrand Extension" project has reached 85% of its budget.',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hrs ago
    },
    {
        id: 'n3',
        type: 'system',
        title: 'Welcome to BuildCompare SA!',
        message: 'Compare building material prices across SA retailers and save up to 30%.',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    },
    {
        id: 'n4',
        type: 'stock_alert',
        title: 'Low Stock Warning',
        message: 'IBR Sheeting at Cashbuild Centurion is running low — only 12 sheets left.',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    },
];

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const panelRef = useRef<HTMLDivElement>(null);

    // Hydrate from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setNotifications(parsed.map((n: any) => ({ ...n, createdAt: new Date(n.createdAt) })));
            } else {
                setNotifications(seedNotifications);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(seedNotifications));
            }
        } catch {
            setNotifications(seedNotifications);
        }
    }, []);

    // Sync to localStorage whenever notifications change
    useEffect(() => {
        if (notifications.length > 0) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications)); } catch { }
        }
    }, [notifications]);

    // Dismiss panel when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const clearAll = () => {
        setNotifications([]);
        try { localStorage.removeItem(STORAGE_KEY); } catch { }
    };

    const getIcon = (type: NotificationItem['type']) => {
        switch (type) {
            case 'price_alert': return <TrendingDown className="w-4 h-4 text-green-400" />;
            case 'budget_warning': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
            case 'stock_alert': return <Package className="w-4 h-4 text-red-400" />;
            case 'system': return <Settings className="w-4 h-4 text-blue-400" />;
        }
    };

    const formatTime = (date: Date) => {
        const diff = Date.now() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-slide-up">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-800/50">
                        <h3 className="font-bold text-white text-sm">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-xs text-yellow-400 hover:text-yellow-300 font-medium flex items-center gap-1"
                                >
                                    <Check className="w-3 h-3" /> Mark all read
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    className="text-xs text-slate-500 hover:text-red-400 font-medium flex items-center gap-1 ml-2"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notification list */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                <p className="text-sm text-slate-500">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => markAsRead(n.id)}
                                    className={`px-4 py-3 border-b border-slate-800/50 cursor-pointer transition-colors hover:bg-slate-800/50 ${!n.read ? 'bg-yellow-500/5 border-l-2 border-l-yellow-400' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex-shrink-0">
                                            {getIcon(n.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-sm font-semibold truncate ${!n.read ? 'text-white' : 'text-slate-400'}`}>
                                                    {n.title}
                                                </p>
                                                {!n.read && <div className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0" />}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                                            <p className="text-[10px] text-slate-600 mt-1">{formatTime(n.createdAt)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
