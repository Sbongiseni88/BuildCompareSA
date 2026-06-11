/**
 * Dashboard data cache.
 *
 * The dashboard's Supabase aggregate query (recent projects + their materials)
 * was completely unmemoized, so every back-navigation to the dashboard
 * re-ran the network round-trip and stalled behind a full-screen skeleton.
 *
 * This is a tiny dependency-free stand-in for SWR/React-Query's
 * stale-while-revalidate behaviour: a module-level cache keyed by user id with
 * a fixed staleTime. The component reads it SYNCHRONOUSLY on mount — a fresh
 * entry hydrates state with zero network wait (no skeleton flash), while a
 * stale entry is served instantly and revalidated in the background.
 */

import type { Project } from '@/types';

/** How long a cached snapshot is considered fresh (no background refetch). */
export const DASHBOARD_STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
    projects: Project[];
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();

export interface CacheRead {
    /** Cached projects, or null when nothing is cached for this user. */
    projects: Project[] | null;
    /** True when a cached entry exists and is still within the staleTime. */
    fresh: boolean;
}

/** Synchronous read used during the initial render to avoid a loading flash. */
export function readDashboardCache(userId: string | undefined, now: number = Date.now()): CacheRead {
    if (!userId) return { projects: null, fresh: false };
    const entry = cache.get(userId);
    if (!entry) return { projects: null, fresh: false };
    return {
        projects: entry.projects,
        fresh: now - entry.timestamp < DASHBOARD_STALE_TIME_MS,
    };
}

export function writeDashboardCache(userId: string | undefined, projects: Project[], now: number = Date.now()): void {
    if (!userId) return;
    cache.set(userId, { projects, timestamp: now });
}

/** Drop a user's snapshot (e.g. on sign-out) so stale data never leaks across sessions. */
export function clearDashboardCache(userId?: string): void {
    if (userId) cache.delete(userId);
    else cache.clear();
}
