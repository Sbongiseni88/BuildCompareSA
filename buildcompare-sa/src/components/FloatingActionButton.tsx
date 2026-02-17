"use client";

import React, { useState } from 'react';
import { Plus, Search, Camera, Bot, X } from 'lucide-react';

interface FloatingActionButtonProps {
    onNewProject: () => void;
    onQuickSearch: () => void;
    onScanBoQ: () => void;
    onAskAI: () => void;
}

export default function FloatingActionButton({
    onNewProject,
    onQuickSearch,
    onScanBoQ,
    onAskAI,
}: FloatingActionButtonProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const actions = [
        { label: 'Ask AI', icon: Bot, onClick: onAskAI, color: 'bg-purple-500' },
        { label: 'Scan BoQ', icon: Camera, onClick: onScanBoQ, color: 'bg-blue-500' },
        { label: 'Search', icon: Search, onClick: onQuickSearch, color: 'bg-green-500' },
        { label: 'New Project', icon: Plus, onClick: onNewProject, color: 'bg-yellow-500' },
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50 lg:hidden flex flex-col-reverse items-end gap-3">
            {/* Main FAB */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isExpanded
                        ? 'bg-slate-700 rotate-45 shadow-slate-700/30'
                        : 'bg-yellow-400 hover:bg-yellow-300 shadow-yellow-400/30 hover:scale-110'
                    }`}
            >
                {isExpanded ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <Plus className="w-6 h-6 text-black" />
                )}
            </button>

            {/* Expanded actions */}
            {isExpanded && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] -z-10"
                        onClick={() => setIsExpanded(false)}
                    />

                    {/* Action buttons */}
                    {actions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                            <div
                                key={action.label}
                                className="flex items-center gap-3 animate-slide-up"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <span className="text-xs font-bold text-white bg-slate-800 px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                                    {action.label}
                                </span>
                                <button
                                    onClick={() => {
                                        action.onClick();
                                        setIsExpanded(false);
                                    }}
                                    className={`w-12 h-12 rounded-full ${action.color} shadow-lg flex items-center justify-center hover:scale-110 transition-transform`}
                                >
                                    <Icon className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
}
