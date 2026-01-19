'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

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
 * Maps Firebase Auth error codes to user-friendly messages
 */
function getErrorMessage(errorCode: string): string {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Invalid email address format.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Invalid password. Please try again.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password must be at least 6 characters.';
        case 'auth/operation-not-allowed':
            return 'This sign-in method is not enabled.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in popup was closed. Please try again.';
        case 'auth/popup-blocked':
            return 'Sign-in popup was blocked. Please enable popups.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        default:
            return 'An error occurred. Please try again.';
    }
}

/**
 * Custom hook for Firebase Authentication
 * Provides auth state and methods for sign in, sign up, and sign out
 */
export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch user profile from Firestore
    const fetchUserProfile = useCallback(async (uid: string): Promise<UserProfile | null> => {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                return {
                    uid,
                    email: data.email || null,
                    displayName: data.displayName || null,
                    role: data.role || null,
                    createdAt: data.createdAt?.toDate() || null,
                };
            }
            return null;
        } catch (err) {
            console.error('Error fetching user profile:', err);
            return null;
        }
    }, []);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                const profile = await fetchUserProfile(firebaseUser.uid);
                setUserProfile(profile);
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, [fetchUserProfile]);

    // Sign in with email and password
    const signIn = useCallback(async (email: string, password: string): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: unknown) {
            const errorCode = (err as { code?: string })?.code || 'unknown';
            const message = getErrorMessage(errorCode);
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Sign up with email, password, name, and role
    const signUp = useCallback(async (
        email: string,
        password: string,
        displayName: string,
        role: UserRole
    ): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Update display name in Firebase Auth
            await updateProfile(firebaseUser, { displayName });

            // Create user profile in Firestore
            await setDoc(doc(db, 'users', firebaseUser.uid), {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName,
                role,
                createdAt: serverTimestamp(),
            });

            // Fetch the profile we just created
            const profile = await fetchUserProfile(firebaseUser.uid);
            setUserProfile(profile);
        } catch (err: unknown) {
            const errorCode = (err as { code?: string })?.code || 'unknown';
            const message = getErrorMessage(errorCode);
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, [fetchUserProfile]);

    // Sign in with Google
    const signInWithGoogle = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            const provider = new GoogleAuthProvider();
            const userCredential = await signInWithPopup(auth, provider);
            const firebaseUser = userCredential.user;

            // Check if user profile exists, if not create one
            const existingProfile = await fetchUserProfile(firebaseUser.uid);
            if (!existingProfile) {
                await setDoc(doc(db, 'users', firebaseUser.uid), {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    role: null, // Will need to be set later
                    createdAt: serverTimestamp(),
                });
            }

            const profile = await fetchUserProfile(firebaseUser.uid);
            setUserProfile(profile);
        } catch (err: unknown) {
            const errorCode = (err as { code?: string })?.code || 'unknown';
            const message = getErrorMessage(errorCode);
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, [fetchUserProfile]);

    // Sign out
    const signOut = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            await firebaseSignOut(auth);
            setUserProfile(null);
        } catch (err: unknown) {
            const errorCode = (err as { code?: string })?.code || 'unknown';
            const message = getErrorMessage(errorCode);
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        user,
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
