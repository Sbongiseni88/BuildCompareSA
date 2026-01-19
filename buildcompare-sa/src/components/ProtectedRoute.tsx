'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    fallbackUrl?: string;
}

/**
 * ProtectedRoute component that guards routes requiring authentication.
 * Redirects to login if user is not authenticated.
 */
export function ProtectedRoute({ children, fallbackUrl = '/login' }: ProtectedRouteProps) {
    const { user, loading } = useAuthContext();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push(fallbackUrl);
        }
    }, [user, loading, router, fallbackUrl]);

    // Show loading state while checking auth
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render children if not authenticated
    if (!user) {
        return null;
    }

    return <>{children}</>;
}
