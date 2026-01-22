'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { UserRole, UserProfile } from '@/utils/authTypes';

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
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', uid)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // Profile not found
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
    }, [supabase]);

    // Initial session check
    useEffect(() => {
        async function getSession() {
            setLoading(true);
            try {
                // Get session directly without timeout race (let Supabase handle its own timeouts)
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Error getting session:', error);
                    setLoading(false);
                    return;
                }

                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    // This fetch is critical but shouldn't block app forever if it fails
                    try {
                        const profile = await fetchUserProfile(session.user.id);
                        setUserProfile(profile);
                    } catch (e) {
                        console.warn('Profile fetch failed quietly', e);
                    }
                }
            } catch (err) {
                console.error("Auth initialization failed:", err);
                // Even on error, stop loading so the app doesn't hang
            } finally {
                setLoading(false);
            }
        }

        getSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
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

            // We use a database trigger to create the profile record, 
            // but we can have an optional manual upsert as a fallback and for local UI update
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
                    // We don't throw here to avoid failing signup if the user record WAS created
                }
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
