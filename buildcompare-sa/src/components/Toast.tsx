'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    onClose: (id: string) => void;
}

const toastStyles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode; iconColor: string }> = {
    success: {
        bg: 'bg-green-900/90',
        border: 'border-green-500/50',
        icon: <CheckCircle className="w-5 h-5" />,
        iconColor: 'text-green-400',
    },
    error: {
        bg: 'bg-red-900/90',
        border: 'border-red-500/50',
        icon: <AlertCircle className="w-5 h-5" />,
        iconColor: 'text-red-400',
    },
    warning: {
        bg: 'bg-orange-900/90',
        border: 'border-orange-500/50',
        icon: <AlertTriangle className="w-5 h-5" />,
        iconColor: 'text-orange-400',
    },
    info: {
        bg: 'bg-blue-900/90',
        border: 'border-blue-500/50',
        icon: <Info className="w-5 h-5" />,
        iconColor: 'text-blue-400',
    },
};

/**
 * Individual Toast component with auto-dismiss and animation
 */
export function Toast({ id, message, type, duration = 5000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    const styles = toastStyles[type];

    useEffect(() => {
        // Trigger entrance animation
        const enterTimer = setTimeout(() => setIsVisible(true), 10);

        // Auto dismiss
        const dismissTimer = setTimeout(() => {
            handleClose();
        }, duration);

        return () => {
            clearTimeout(enterTimer);
            clearTimeout(dismissTimer);
        };
    }, [duration]);

    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(() => {
            onClose(id);
        }, 300);
    };

    return (
        <div
            className={`
                flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg
                ${styles.bg} ${styles.border}
                transform transition-all duration-300 ease-out
                ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
            `}
            role="alert"
        >
            <span className={styles.iconColor}>{styles.icon}</span>
            <p className="text-white text-sm font-medium flex-1">{message}</p>
            <button
                onClick={handleClose}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                aria-label="Close notification"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

/**
 * Toast Container - renders toasts in a fixed position
 */
export interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContainerProps {
    toasts: ToastItem[];
    onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <Toast
                        id={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={onClose}
                    />
                </div>
            ))}
        </div>
    );
}
