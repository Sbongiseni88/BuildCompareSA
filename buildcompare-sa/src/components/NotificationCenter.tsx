"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bell, TrendingDown, AlertTriangle, Package, Settings, Check, X, Trash2 } from 'lucide-react';

import { createClient } from '@/utils/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface NotificationItem {
    id: string;
    type: 'price-drop' | 'stock-alert' | 'delivery' | 'system';
    title: string;
    message: string;
    read: boolean;
    created_at: string;
}

export default function NotificationCenter() {
    const { user } = useAuthContext();
    const supabase = createClient();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const panelRef = useRef<HTMLDivElement>(null);

    // Fetch from Supabase
    useEffect(() => {
        if (!user) return;

        const fetchNotifications = async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (!error && data) {
                setNotifications(data);
            }
        };

        fetchNotifications();

        // Optional: subscribe to new notifications
        const channel = supabase
            .channel('realtime_notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            }, (payload: any) => {
                setNotifications(prev => [payload.new as NotificationItem, ...prev].slice(0, 5));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, supabase]);

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

    const markAllRead = async () => {
        if (!user) return;
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id)
            .eq('read', false);
    };

    const markAsRead = async (id: string) => {
        const notif = notifications.find(n => n.id === id);
        if (notif?.read) return;

        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);
    };

    const clearAll = async () => {
        if (!user) return;
        setNotifications([]);
        await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.id);
    };

    const getIcon = (type: NotificationItem['type'], title: string) => {
        if (title.toLowerCase().includes('budget')) {
            return <AlertTriangle className="w-5 h-5 text-red-500" />;
        }
        switch (type) {
            case 'price-drop': return <TrendingDown className="w-5 h-5 text-green-500" />;
            case 'stock-alert': return <Package className="w-5 h-5 text-orange-500" />;
            case 'delivery': return <Check className="w-5 h-5 text-blue-500" />;
            case 'system': return <Settings className="w-5 h-5 text-slate-400" />;
            default: return <Bell className="w-5 h-5 text-slate-400" />;
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
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
                                            {getIcon(n.type, n.title)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-base font-bold truncate ${!n.read ? 'text-white' : 'text-slate-400'}`}>
                                                    {n.title}
                                                </p>
                                                {!n.read && <div className="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />}
                                            </div>
                                            <p className={`text-sm mt-0.5 ${!n.read ? 'text-slate-300' : 'text-slate-500'}`}>{n.message}</p>
                                            <p className="text-[11px] font-medium text-slate-500 mt-2 uppercase tracking-wider">{formatTime(n.created_at)}</p>
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
