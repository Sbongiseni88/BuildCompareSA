import { createBrowserClient } from '@supabase/ssr'

// Singleton pattern to ensure only ONE client instance exists in the browser
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Check if we are in a build environment or missing keys
    if (!url || !key) {
        // During build, we might not have these. 
        // We return a 'dummy' client or just log to avoid crashing the build.
        // Vercel build will fail if we throw here.
        if (typeof window === 'undefined') {
            console.warn('Supabase environment variables are missing during build/SSR.');
        }
    }

    if (!supabaseClient) {
        supabaseClient = createBrowserClient(
            url || '',
            key || ''
        );
    }
    return supabaseClient;
}
