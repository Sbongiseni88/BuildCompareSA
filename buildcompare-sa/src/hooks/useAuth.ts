'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { UserRole, UserProfile } from '@/utils/authTypes';
export type { UserRole, UserProfile };

export interface AuthState {
    user: User | null;
    session: Session | null;
    userProfile: UserProfile | null;
    loading: boolean;
    error: string | null;
}

export interface AuthActions {
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    clearError: () => void;
}

export type UseAuthReturn = AuthState & AuthActions;

// Maximum time we wait for auth to resolve before showing the app anyway
const AUTH_TIMEOUT_MS = 8000;

/**
 * Custom hook for Supabase Authentication
 */
export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Use a ref for the supabase client to prevent re-render dependency issues
    const supabaseRef = useRef(createClient());
    const supabase = supabaseRef.current;

    // Track whether initial auth check has completed (prevent double-execution)
    const initializedRef = useRef(false);

    // Fetch user profile from Database
    const fetchUserProfile = useCallback(async (uid: string): Promise<UserProfile | null> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', uid)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.warn('Profile not found for user:', uid);
                } else {
                    console.error('Error fetching user profile:', error);
                }
                return null;
            }

            if (data) {
                return {
                    uid: data.id,
                    email: data.email,
                    displayName: data.full_name,
                    role: data.role as UserRole,
                    createdAt: new Date(data.created_at),
                } as UserProfile;
            }
            return null;
        } catch (err) {
            console.error('Unexpected error fetching user profile:', err);
            return null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Initial session check - runs only ONCE
    useEffect(() => {
        // Guard against double-execution in StrictMode
        if (initializedRef.current) return;
        initializedRef.current = true;

        // Safety timeout - if auth doesn't resolve, stop loading anyway
        const timeoutId = setTimeout(() => {
            setLoading(prevLoading => {
                if (prevLoading) {
                    console.warn(`⚠️ Auth check timed out after ${AUTH_TIMEOUT_MS}ms. Proceeding without auth.`);
                    return false;
                }
                return prevLoading;
            });
        }, AUTH_TIMEOUT_MS);

        async function getSession() {
            try {
                console.log('🔐 Starting auth session check...');
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Error getting session:', error);
                    setLoading(false);
                    clearTimeout(timeoutId);
                    return;
                }

                console.log('🔐 Session result:', session ? 'Authenticated' : 'No session');
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    try {
                        const profile = await fetchUserProfile(session.user.id);
                        setUserProfile(profile);
                    } catch (e) {
                        console.warn('Profile fetch failed quietly', e);
                    }
                }
            } catch (err) {
                console.error("Auth initialization failed:", err);
            } finally {
                setLoading(false);
                clearTimeout(timeoutId);
            }
        }

        getSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
            console.log('🔐 Auth state changed:', _event);
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                const profile = await fetchUserProfile(session.user.id);
                setUserProfile(profile);
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => {
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
        // Empty deps - this runs only once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sign in with email and password
    const signIn = useCallback(async (email: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An error occurred during sign in.';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sign up
    const signUp = useCallback(async (
        email: string,
        password: string,
        displayName: string,
        role: UserRole
    ) => {
        setLoading(true);
        setError(null);
        try {
            const { data: { user }, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: displayName,
                        role: role,
                    },
                },
            });

            if (error) throw error;

            if (user) {
                const profileData = {
                    id: user.id,
                    email: email,
                    full_name: displayName,
                    role: role,
                };

                const { error: profileError } = await supabase.from('profiles').upsert(profileData);

                if (profileError) {
                    console.error('Error creating profile:', profileError);
                }
            }

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An error occurred during sign up.';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sign in with Google
    const signInWithGoogle = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An error occurred during Google sign in.';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sign out
    const signOut = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setUserProfile(null);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error signing out.';
            setError(message);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return useMemo(() => ({
        user,
        session,
        userProfile,
        loading,
        error,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        clearError,
    }), [
        user,
        session,
        userProfile,
        loading,
        error,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        clearError
    ]);
}
