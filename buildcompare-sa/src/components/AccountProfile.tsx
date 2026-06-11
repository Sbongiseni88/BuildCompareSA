"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/utils/supabase/client';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
    User,
    Mail,
    Shield,
    Calendar,
    LogOut,
    Edit2,
    Save,
    X,
    Loader2,
    Award
} from 'lucide-react';
import { CIDB_CLASSES, CIDB_TENDER_LIMITS, parseCidbGrading, type CidbGrade } from '@/lib/cidb';

interface UserProfileData {
    id: string;
    email: string;
    full_name: string;
    role: string;
    created_at: string;
    /** CIDB grading designation preset, e.g. "4GB", "7CE". */
    cidb_grading?: string | null;
}

export default function AccountProfile() {
    const { user, loading: authLoading, signOut } = useAuthContext();
    const { showSuccess, showError } = useToast();
    const supabaseRef = useRef(createClient());
    const supabase = supabaseRef.current;
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('');
    const [cidbGrade, setCidbGrade] = useState('');   // '1'–'9', '' = not set
    const [cidbClass, setCidbClass] = useState('GB'); // class of works code
    const [isSaving, setIsSaving] = useState(false);

    // The designation persisted to the profile ("4GB"), or null when unset.
    const cidbDesignation = cidbGrade ? `${cidbGrade}${cidbClass}` : null;

    // Retry counter — bumping it re-runs the fetch effect (NO page reload:
    // window.location.reload() here re-entered the Account tab from
    // localStorage and produced an app-wide refresh loop).
    const [fetchAttempt, setFetchAttempt] = useState(0);

    useEffect(() => {
        if (authLoading) return;
        if (!user?.id) {
            // Auth resolved but no user — stop the spinner immediately.
            setIsLoading(false);
            return;
        }

        const abortController = new AbortController();
        // Distinguishes "this effect instance was superseded/unmounted"
        // (stay silent) from a genuine in-flight timeout (show a message).
        let supersededByCleanup = false;
        let timedOut = false;

        const fetchProfileData = async () => {
            setIsLoading(true);
            setFetchError(null);

            const softAbort = setTimeout(() => {
                timedOut = true;
                abortController.abort(new Error('Connection timed out'));
            }, 6000);

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .abortSignal(abortController.signal)
                    .single();

                clearTimeout(softAbort);
                if (supersededByCleanup) return;
                if (error) throw error;

                if (data) {
                    setProfile(data);
                    setFullName(data.full_name || '');
                    setRole(data.role || 'contractor');
                    const grading = parseCidbGrading(data.cidb_grading);
                    if (grading) {
                        setCidbGrade(String(grading.grade));
                        setCidbClass(grading.classOfWorks);
                    }
                    setFetchError(null);
                }
            } catch (error: any) {
                // An abort from THIS effect's cleanup (tab switch, StrictMode
                // re-run) must never surface as an error — the race where the
                // stale rejection landed after the re-run started is exactly
                // what froze the page on "AbortError: operation was aborted".
                if (supersededByCleanup || (error?.name === 'AbortError' && !timedOut)) return;
                console.error('Error fetching profile:', error);
                setFetchError(timedOut ? 'Connection timed out. Please retry.' : (error.message || 'Failed to load profile'));
            } finally {
                clearTimeout(softAbort);
                if (!supersededByCleanup) setIsLoading(false);
            }
        };

        fetchProfileData();

        // Hard failsafe — release the spinner no matter what after 9 s so the
        // Account page can never appear permanently stalled.
        const hardFailsafe = setTimeout(() => {
            setIsLoading(false);
        }, 9000);

        return () => {
            supersededByCleanup = true;
            abortController.abort();
            clearTimeout(hardFailsafe);
        };
    }, [user?.id, authLoading, supabase, fetchAttempt]);

    const handleUpdateProfile = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const updates = {
                id: user.id,
                full_name: fullName,
                role: role,
                cidb_grading: cidbDesignation,
                updated_at: new Date().toISOString(),
            };

            let { error } = await supabase.from('profiles').upsert(updates);

            // Tolerate the cidb_grading migration not being applied yet:
            // save the rest of the profile and tell the user what's missing.
            if (error && /cidb_grading/i.test(error.message || '')) {
                ({ error } = await supabase.from('profiles').upsert({
                    id: user.id,
                    full_name: fullName,
                    role: role,
                    updated_at: updates.updated_at,
                }));
                if (!error) {
                    showError('Profile saved, but CIDB grading needs the database migration (supabase/profile_cidb.sql) before it can be stored.');
                }
            }

            if (error) throw error;

            setProfile(prev => prev ? { ...prev, full_name: fullName, role, cidb_grading: cidbDesignation } : null);
            setIsEditing(false);
            showSuccess('Profile updated successfully!');
        } catch (error: any) {
            console.error('Error updating profile:', error);
            showError(`Failed to update profile: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSignOut = async () => {
        setShowSignOutConfirm(true);
    };

    const confirmSignOut = async () => {
        setShowSignOutConfirm(false);
        await signOut();
    };

    if (authLoading || (isLoading && !profile)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="w-10 h-10 text-yellow-400 animate-spin mb-4" />
                <p className="text-slate-400">Loading your profile...</p>
            </div>
        );
    }

    if (fetchError || !profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                    <X className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Connection Issue</h3>
                <p className="text-slate-400 max-w-sm mx-auto mb-6">
                    {fetchError || "Failed to load profile. This might occur if you've been offline for a while or left the app open."}
                </p>
                <button
                    onClick={() => setFetchAttempt((n) => n + 1)}
                    className="btn-primary"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">My Account</h1>
                    <p className="text-slate-400">Manage your personal information and settings</p>
                </div>
                <button
                    onClick={handleSignOut}
                    className="btn-secondary text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20 flex items-center gap-2"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>

            {/* Profile Card */}
            <div className="glass-card p-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Column: Avatar & Info */}
                    <div className="flex flex-col items-center md:items-start gap-4 md:w-1/3 border-b md:border-b-0 md:border-r border-slate-700 pb-6 md:pb-0 md:pr-6">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <span className="text-4xl font-bold text-white">
                                {fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                            </span>
                        </div>

                        <div className="text-center md:text-left w-full">
                            <h2 className="text-xl font-bold text-white">{fullName || 'User'}</h2>
                            <p className="text-sm text-yellow-400 font-medium uppercase tracking-wider mt-1">{role}</p>
                            <p className="text-slate-400 text-sm mt-2 flex items-center justify-center md:justify-start gap-2">
                                <Mail className="w-3 h-3" />
                                {profile.email}
                            </p>
                        </div>

                        <div className="w-full pt-6 border-t border-slate-700/50 mt-2">
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-slate-500">Member Since</span>
                                <span className="text-slate-300">
                                    {new Date(profile.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Edit Form */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <User className="w-5 h-5 text-yellow-400" />
                                Personal Details
                            </h3>
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-sm text-slate-400 hover:text-yellow-400 flex items-center gap-1 transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Edit Profile
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Full Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        disabled={!isEditing}
                                        className={`input-field pl-10 ${!isEditing && 'opacity-60 cursor-not-allowed selection:bg-none'}`}
                                    />
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Email Address</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={profile.email}
                                        disabled={true}
                                        className="input-field pl-10 opacity-60 cursor-not-allowed"
                                    />
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Email cannot be changed.</p>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Role / Profession</label>
                                <div className="relative">
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        disabled={!isEditing}
                                        className={`input-field pl-10 ${!isEditing && 'opacity-60 cursor-not-allowed'}`}
                                    >
                                        <option value="contractor">Contractor</option>
                                        <option value="supplier">Supplier</option>
                                    </select>
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-2">CIDB Grading (e.g. 4GB, 7CE)</label>
                                <div className="flex gap-3">
                                    <div className="relative w-1/3">
                                        <select
                                            value={cidbGrade}
                                            onChange={(e) => setCidbGrade(e.target.value)}
                                            disabled={!isEditing}
                                            className={`input-field pl-10 ${!isEditing && 'opacity-60 cursor-not-allowed'}`}
                                            aria-label="CIDB grade"
                                        >
                                            <option value="">Not set</option>
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                                                <option key={g} value={g}>Grade {g}</option>
                                            ))}
                                        </select>
                                        <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    </div>
                                    <select
                                        value={cidbClass}
                                        onChange={(e) => setCidbClass(e.target.value)}
                                        disabled={!isEditing || !cidbGrade}
                                        className={`input-field flex-1 ${(!isEditing || !cidbGrade) && 'opacity-60 cursor-not-allowed'}`}
                                        aria-label="CIDB class of works"
                                    >
                                        {Object.entries(CIDB_CLASSES).map(([code, label]) => (
                                            <option key={code} value={code}>{code} — {label}</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    {cidbGrade
                                        ? (() => {
                                            const limit = CIDB_TENDER_LIMITS[Number(cidbGrade) as CidbGrade];
                                            return limit == null
                                                ? `Grade ${cidbGrade}${cidbClass}: unlimited tender value.`
                                                : `Grade ${cidbGrade}${cidbClass}: tenders up to R${limit.toLocaleString('en-ZA')}. BoQs above this get flagged in Price Search.`;
                                        })()
                                        : 'Set your cidb registration so over-limit BoQs are flagged before you bid.'}
                                </p>
                            </div>

                            {isEditing && (
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setFullName(profile.full_name);
                                            setRole(profile.role);
                                            const grading = parseCidbGrading(profile.cidb_grading);
                                            setCidbGrade(grading ? String(grading.grade) : '');
                                            setCidbClass(grading ? grading.classOfWorks : 'GB');
                                        }}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpdateProfile}
                                        disabled={isSaving}
                                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Changes
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* System Info */}
            <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">System Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-500">User ID</span>
                        <span className="text-slate-300 font-mono text-xs">{profile.id}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-500">Account Type</span>
                        <span className="text-yellow-400 font-medium capitalize">{profile.role}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-500">Last Login</span>
                        <span className="text-slate-300">Just Now</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-500">App Version</span>
                        <span className="text-slate-300">2.0.0 (Production)</span>
                    </div>
                </div>
            </div>

            {/* Sign Out Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showSignOutConfirm}
                onClose={() => setShowSignOutConfirm(false)}
                onConfirm={confirmSignOut}
                title="Sign Out"
                message="Are you sure you want to sign out of your account?"
                confirmLabel="Sign Out"
                variant="warning"
            />
        </div>
    );
}
