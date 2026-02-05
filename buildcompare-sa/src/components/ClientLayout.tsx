"use client";
import React, { useState, useEffect } from 'react';
import SplashScreen from './SplashScreen';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const [showSplash, setShowSplash] = useState(true);

    const handleSplashFinish = () => {
        setShowSplash(false);
    };

    return (
        <>
            {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
            <div className={`min-h-screen transition-opacity duration-700 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
                {children}
            </div>
        </>
    );
}
