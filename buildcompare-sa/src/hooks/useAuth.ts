'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export type UserRole = 'contractor' | 'supplier';

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    role: UserRole | null;
    createdAt: Date | null;
}

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

/**
 * Custom hook for Supabase Authentication
 */
export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    // Fetch user profile from Database
    const fetchUserProfile = useCallback(async (uid: string) => {
        try {
            // First try to get profile
            const { data, error } = await supabase
                .from('profiles') // Assuming a 'profiles' or 'users' table exists
                .select('*')
                .eq('id', uid) // Supabase typically uses 'id' which matches auth.uid()
                .single();

            if (data) {
                return {
                    uid: data.id,
                    email: data.email,
                    displayName: data.full_name || data.display_name,
                    role: data.role as UserRole,
                    createdAt: new Date(data.created_at),
                } as UserProfile;
            }
            return null;
        } catch (err) {
            console.error('Error fetching user profile:', err);
            return null;
        }
    }, [supabase]);

    // Initial session check
    useEffect(() => {
        async function getSession() {
            setLoading(true);
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('Error getting session:', error);
                setLoading(false);
                return;
            }

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                const profile = await fetchUserProfile(session.user.id);
                setUserProfile(profile);
            }
            setLoading(false);
        }

        getSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
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

        return () => subscription.unsubscribe();
    }, [supabase, fetchUserProfile]);

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
    }, [supabase]);

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

            // In Supabase, we might need to manually create the profile record if a Trigger doesn't do it.
            // Assuming we rely on a PostgreSQL Trigger for now, or just the metadata.
            // If manual creation is needed:
            if (user) {
                await supabase.from('profiles').upsert({
                    id: user.id,
                    email: email,
                    full_name: displayName,
                    role: role,
                    // user_id: user.id
                });
            }

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An error occurred during sign up.';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [supabase]);

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
    }, [supabase]);

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
    }, [supabase]);

    const clearError = useCallback(() => setError(null), []);

    return {
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
    };
}
