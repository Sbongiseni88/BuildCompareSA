"use client";

import React from 'react';
import { X, AlertTriangle, Trash2, LogOut, Info } from 'lucide-react';

export interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    loading = false,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const iconMap = {
        danger: <Trash2 className="w-6 h-6" />,
        warning: <AlertTriangle className="w-6 h-6" />,
        info: <Info className="w-6 h-6" />,
    };

    const colorMap = {
        danger: {
            iconBg: 'bg-red-500/20',
            iconText: 'text-red-400',
            buttonBg: 'bg-red-500 hover:bg-red-400',
            buttonText: 'text-white',
            border: 'border-red-500/20',
        },
        warning: {
            iconBg: 'bg-yellow-500/20',
            iconText: 'text-yellow-400',
            buttonBg: 'bg-yellow-500 hover:bg-yellow-400',
            buttonText: 'text-black',
            border: 'border-yellow-500/20',
        },
        info: {
            iconBg: 'bg-blue-500/20',
            iconText: 'text-blue-400',
            buttonBg: 'bg-blue-500 hover:bg-blue-400',
            buttonText: 'text-white',
            border: 'border-blue-500/20',
        },
    };

    const colors = colorMap[variant];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 animate-scale-in overflow-hidden">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-10"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="p-6 space-y-5">
                    {/* Icon + Title */}
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl ${colors.iconBg} ${colors.iconText} flex items-center justify-center flex-shrink-0`}>
                            {iconMap[variant]}
                        </div>
                        <div className="pt-1">
                            <h3 className="text-lg font-bold text-white">{title}</h3>
                            <p className="text-sm text-slate-400 mt-1 leading-relaxed">{message}</p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors disabled:opacity-50"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                if (!loading) onClose();
                            }}
                            disabled={loading}
                            className={`flex-1 px-4 py-3 ${colors.buttonBg} ${colors.buttonText} font-bold rounded-xl transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2`}
                        >
                            {loading && (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            )}
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
