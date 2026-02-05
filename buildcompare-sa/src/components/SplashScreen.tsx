"use client";
import React, { useEffect, useState } from 'react';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Start exit animation slightly before the total time
        const exitTimer = setTimeout(() => {
            setIsExiting(true);
        }, 2000); // 2 seconds of showing

        const finishTimer = setTimeout(() => {
            onFinish();
        }, 2500); // Wait for fade out to complete

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(finishTimer);
        };
    }, [onFinish]);

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 transition-opacity duration-500 ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex flex-col items-center gap-6 animate-scale-in">
                <div className="w-24 h-24 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-400/20 mb-2 animate-pulse">
                    {/* Using simple img tag for the logo */}
                    <img src="/images/logo.png" alt="BuildCompare Logo" className="w-[70px] h-[70px] object-contain" />
                </div>

                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-white tracking-widest">
                        BUILD<span className="text-yellow-400">COMPARE</span>
                    </h1>
                    <p className="text-slate-400 text-sm tracking-wide uppercase">South Africa</p>
                </div>

                <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mt-8">
                    <div className="h-full bg-yellow-400 animate-progress-bar shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
                </div>
            </div>
        </div>
    );
}
