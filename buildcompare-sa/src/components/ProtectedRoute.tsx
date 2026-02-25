'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    fallbackUrl?: string;
}

// Bail out of loading after this many ms
const LOADING_TIMEOUT_MS = 6000;

/**
 * ProtectedRoute component that guards routes requiring authentication.
 * Redirects to login if user is not authenticated.
 */
export function ProtectedRoute({ children, fallbackUrl = '/login' }: ProtectedRouteProps) {
    const { user, loading } = useAuthContext();
    const router = useRouter();
    const [forceReady, setForceReady] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push(fallbackUrl);
        }
    }, [user, loading, router, fallbackUrl]);

    // Failsafe: don't let a stuck auth state block the whole app
    useEffect(() => {
        if (!loading) return; // Already resolved, no need for timeout

        const timer = setTimeout(() => {
            console.warn(`⚠️ ProtectedRoute: loading timed out after ${LOADING_TIMEOUT_MS}ms, forcing render.`);
            setForceReady(true);
        }, LOADING_TIMEOUT_MS);

        return () => clearTimeout(timer);
    }, [loading]);

    // Spinner while auth resolves (capped by timeout above)
    if (loading && !forceReady) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    // Auth failed or not logged in — bail
    if (!user) {
        return null;
    }

    return <>{children}</>;
}

