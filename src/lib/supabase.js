import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    // Fail loudly in dev rather than silently creating a client that will
    // 404 on every request — this is the #1 "why is nothing working" bug.
    console.error('Missing Supabase env vars. Check your .env.local for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Explicit, so the signed-in session survives an app close/reopen —
        // important for a PWA someone installs once and expects to "just work".
        persistSession: true,
        autoRefreshToken: true,
        storage: window.localStorage,
        storageKey: 'liwanag-auth',
    },
});