import { createBrowserClient } from '@supabase/ssr'

// Singleton pattern to ensure only ONE client instance exists in the browser
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
    if (!supabaseClient) {
        supabaseClient = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }
    return supabaseClient;
}
