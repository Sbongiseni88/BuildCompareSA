"use client";

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Wifi, Zap } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((reg) => {
                    console.log('✅ Service Worker registered:', reg.scope);
                })
                .catch((err) => {
                    console.log('Service Worker registration failed:', err);
                });
        }

        // Already running as an installed app — no need to show the banner
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Respect if user dismissed this recently
        const dismissed = localStorage.getItem('pwa-banner-dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            // Show again after 7 days
            if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
                return;
            }
        }

        // Capture the browser's install prompt so we can trigger it later
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Wait a bit before showing — don't interrupt the initial load
            setTimeout(() => setShowBanner(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsInstalled(true);
        }

        setDeferredPrompt(null);
        setShowBanner(false);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
    };

    if (!showBanner || isInstalled) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 animate-slide-up">
            <div className="max-w-lg mx-auto bg-slate-900/95 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-5 shadow-2xl shadow-black/50">
                {/* Close */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="w-14 h-14 bg-yellow-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-yellow-400/20">
                        <img src="/images/logo.png" alt="BuildCompare" className="w-10 h-10 object-contain" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <h3 className="text-white font-bold text-lg mb-1">
                            Install BuildCompare
                        </h3>
                        <p className="text-slate-400 text-sm mb-3">
                            Add to your home screen for quick access on-site
                        </p>

                        {/* Benefits */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className="flex items-center gap-1 text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded-full">
                                <Zap className="w-3 h-3 text-yellow-400" /> Faster loading
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded-full">
                                <Wifi className="w-3 h-3 text-green-400" /> Works offline
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded-full">
                                <Smartphone className="w-3 h-3 text-blue-400" /> No app store
                            </span>
                        </div>

                        {/* Action */}
                        <button
                            onClick={handleInstall}
                            className="w-full px-4 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:from-yellow-300 hover:to-yellow-400 transition-all hover:scale-[1.02] shadow-lg shadow-yellow-400/20"
                        >
                            <Download className="w-5 h-5" />
                            Install App — It&apos;s Free
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
