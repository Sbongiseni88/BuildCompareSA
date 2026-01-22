'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { UserRole } from '@/utils/authTypes';

export default function SignupPage() {
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole>('contractor');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const router = useRouter();
    const { signUp, signInWithGoogle } = useAuthContext();
    const { showError, showSuccess, showWarning } = useToast();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate passwords match
        if (password !== confirmPassword) {
            showWarning('Passwords do not match');
            return;
        }

        // Validate password length
        if (password.length < 6) {
            showWarning('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await signUp(email, password, displayName, role);
            showSuccess('Account created successfully!');
            router.push('/');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to create account';
            showError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setGoogleLoading(true);

        try {
            await signInWithGoogle();
            showSuccess('Signed up with Google!');
            router.push('/');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to sign up with Google';
            showError(message);
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-8">
            <div className="w-full max-w-md space-y-6 rounded-2xl bg-slate-800 p-8 shadow-xl border border-slate-700">
                {/* Logo/Brand */}
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-yellow-400/20">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-slate-900">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Create Account</h2>
                    <p className="text-slate-400">Join BuildCompare SA today</p>
                </div>

                {/* Google Sign Up */}
                <button
                    type="button"
                    onClick={handleGoogleSignup}
                    disabled={googleLoading || loading}
                    className="group relative flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                >
                    {googleLoading ? (
                        <svg className="animate-spin h-5 w-5 text-slate-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                    )}
                    {googleLoading ? 'Signing up...' : 'Continue with Google'}
                </button>

                {/* Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-slate-800 px-4 text-slate-400">or continue with email</span>
                    </div>
                </div>

                {/* Signup Form */}
                <form className="space-y-5" onSubmit={handleSignup}>
                    <div className="space-y-4">
                        {/* Full Name */}
                        <div>
                            <label htmlFor="displayName" className="block text-sm font-medium text-slate-300">
                                Full Name
                            </label>
                            <input
                                id="displayName"
                                name="displayName"
                                type="text"
                                autoComplete="name"
                                required
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:border-yellow-500 focus:ring-yellow-500 hover:border-slate-600 transition-colors"
                                placeholder="John Smith"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                disabled={loading || googleLoading}
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:border-yellow-500 focus:ring-yellow-500 hover:border-slate-600 transition-colors"
                                placeholder="contractor@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading || googleLoading}
                            />
                        </div>

                        {/* Role Selection */}
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-slate-300">
                                I am a
                            </label>
                            <select
                                id="role"
                                name="role"
                                required
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white focus:border-yellow-500 focus:ring-yellow-500 hover:border-slate-600 transition-colors cursor-pointer"
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                                disabled={loading || googleLoading}
                            >
                                <option value="contractor">🔨 Contractor</option>
                                <option value="supplier">🏪 Supplier</option>
                            </select>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={6}
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:border-yellow-500 focus:ring-yellow-500 hover:border-slate-600 transition-colors"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading || googleLoading}
                            />
                            <p className="mt-1 text-xs text-slate-500">Must be at least 6 characters</p>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={6}
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:border-yellow-500 focus:ring-yellow-500 hover:border-slate-600 transition-colors"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading || googleLoading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || googleLoading}
                        className="group relative flex w-full justify-center rounded-lg bg-yellow-500 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-[0_4px_14px_rgba(250,204,21,0.3)] hover:shadow-[0_6px_20px_rgba(250,204,21,0.4)]"
                    >
                        {loading ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : null}
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>

                    <div className="text-center text-sm">
                        <span className="text-slate-400">Already have an account? </span>
                        <Link href="/login" className="font-medium text-yellow-500 hover:text-yellow-400 transition-colors">
                            Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
