import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseKey = supabaseAnonKey || supabasePublishableKey;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase environment variables. Please check your .env file.');
}

const createSupabaseClient = () =>
  createClient(
    supabaseUrl || '',
    supabaseKey || '',
    {
      auth: {
        // Avoid noisy refresh-token retry loops when auth endpoint/network is unstable.
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: false,
      },
    }
  );

const globalKey = '__hospital_supabase_client__';
type GlobalWithSupabase = typeof globalThis & {
  [globalKey]?: ReturnType<typeof createSupabaseClient>;
};

const globalRef = globalThis as GlobalWithSupabase;

export const supabase = globalRef[globalKey] || createSupabaseClient();

if (!globalRef[globalKey]) {
  globalRef[globalKey] = supabase;
}
