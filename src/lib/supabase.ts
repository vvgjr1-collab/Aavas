import { createClient } from '@supabase/supabase-js';

/**
 * The Supabase browser client.
 *
 * The anon key is meant to be public - it ships inside a bundle anyone can
 * download from GitHub Pages, and inside the Android APK. It grants nothing on
 * its own: every table is behind Row Level Security, and `anon` holds no
 * privileges at all (see supabase/migrations/20260904120100_policies.sql).
 *
 * The service-role key is the opposite. It bypasses RLS entirely and must never
 * appear in this file, in any VITE_-prefixed variable, or in the repository.
 * Vite inlines every VITE_ variable into the bundle at build time.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Whether the app has a backend configured at all.
 *
 * Guest login stays a purely local demo path, so the app has to run with no
 * project configured. Anything that talks to the database checks this first.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[aavas] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set - ' +
      'running without a backend. Copy .env.example to .env to connect one.',
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        // Keep the session across reloads and refresh it in the background;
        // this is what makes an account survive closing the app.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // PKCE, specifically because this app uses a HashRouter.
        //
        // The implicit flow returns tokens in the URL *fragment*
        // (#access_token=...), which is the same place HashRouter keeps the
        // route. The two fight: the router sees a garbage path, and whether
        // the client parses the token before the router rewrites the hash is a
        // race. PKCE returns ?code=... as a query parameter instead, which
        // sits before the '#' and which HashRouter ignores entirely.
        flowType: 'pkce',
      },
    })
  : null;

/** Narrow the nullable client at a call site that requires a backend. */
export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}
