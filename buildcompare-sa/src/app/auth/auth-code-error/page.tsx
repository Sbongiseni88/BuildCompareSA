'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function AuthErrorPage() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-8">
            <div className="w-full max-w-md space-y-6 rounded-2xl bg-slate-800 p-8 shadow-xl border border-slate-700 text-center">
                <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-white">Authentication Error</h1>

                <p className="text-slate-300">
                    {error || 'There was an issue signing you in. Please try again.'}
                </p>

                <div className="pt-4">
                    <Link
                        href="/login"
                        className="inline-block w-full rounded-lg bg-yellow-500 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
                    >
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
