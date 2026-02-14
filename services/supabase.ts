import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (url: string) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

const isConfigValid = supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl);

if (!isConfigValid) {
    console.error('Missing or invalid Supabase environment variables. Please check your .env file.');
}

// Fallback mock to prevent app crash if config is missing
export const supabase = isConfigValid
    ? createClient(supabaseUrl || '', supabaseAnonKey || '')
    : {
        auth: {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured. Check .env file.' } }),
            signOut: () => Promise.resolve({ error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        },
        from: () => ({
            select: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        })
    } as any;
