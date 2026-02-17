'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
            });

            if (error) throw error;
            setSent(true);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to send reset email';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-8">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-slate-800 p-8 shadow-xl border border-slate-700">
                {/* Back link */}
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-yellow-400 transition-colors font-medium group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Login
                </Link>

                {!sent ? (
                    <>
                        {/* Header */}
                        <div className="text-center">
                            <div className="mx-auto w-16 h-16 bg-yellow-400/20 rounded-2xl flex items-center justify-center mb-4">
                                <Mail className="w-8 h-8 text-yellow-400" />
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                                Forgot Password?
                            </h2>
                            <p className="text-slate-400">
                                No worries! Enter your email and we&apos;ll send you a reset link.
                            </p>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <form className="space-y-6" onSubmit={handleReset}>
                            <div>
                                <label htmlFor="reset-email" className="block text-sm font-medium text-slate-300">
                                    Email address
                                </label>
                                <input
                                    id="reset-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:border-yellow-500 focus:ring-yellow-500 hover:border-slate-600 transition-colors"
                                    placeholder="contractor@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative flex w-full justify-center rounded-lg bg-yellow-500 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-[0_4px_14px_rgba(250,204,21,0.3)] hover:shadow-[0_6px_20px_rgba(250,204,21,0.4)]"
                            >
                                {loading ? (
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : null}
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>
                    </>
                ) : (
                    /* Success state */
                    <div className="text-center space-y-4 py-4">
                        <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4 animate-scale-in">
                            <CheckCircle className="w-10 h-10 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Check Your Email</h2>
                        <p className="text-slate-400 max-w-xs mx-auto">
                            We&apos;ve sent a password reset link to{' '}
                            <span className="text-white font-medium">{email}</span>.
                            Please check your inbox and spam folder.
                        </p>
                        <div className="pt-4 space-y-3">
                            <button
                                onClick={() => { setSent(false); setEmail(''); }}
                                className="text-sm text-slate-400 hover:text-yellow-400 transition-colors font-medium"
                            >
                                Didn&apos;t receive it? Try again
                            </button>
                            <div>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-sm font-bold text-yellow-500 hover:text-yellow-400 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Login
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
