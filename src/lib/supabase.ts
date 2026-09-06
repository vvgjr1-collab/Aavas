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

/**
 * "Remember me", meaning something concrete.
 *
 * Supabase keeps the session in localStorage, which survives closing the
 * browser - so the checkbox on the sign-in form did nothing at all: every
 * sign-in was remembered whether or not it was ticked. Unticked now means
 * sessionStorage, which the browser drops when the tab closes. That is the
 * behaviour someone signing in on a shared machine is asking for.
 */
const REMEMBER_KEY = 'aavas.remember-me';

/** In-memory fallback: a private window can refuse storage outright. */
const memory = new Map<string, string>();

function store(kind: 'local' | 'session'): Storage | null {
  try {
    const s = kind === 'local' ? window.localStorage : window.sessionStorage;
    // Touching it is what throws when storage is blocked, not reading it.
    s.getItem(REMEMBER_KEY);
    return s;
  } catch {
    return null;
  }
}

/**
 * Absent means remembered.
 *
 * Staying signed in is what someone expects from a phone or their own laptop,
 * and it is what this app did before the checkbox was wired to anything.
 * Unticking is the deliberate act, for a machine that is not yours.
 */
export function getRememberMe(): boolean {
  return store('local')?.getItem(REMEMBER_KEY) !== 'false';
}

function isRemembered(): boolean {
  return getRememberMe();
}

/**
 * Record the choice. Called before signing in, so the session lands in the
 * right place first time rather than being moved afterwards.
 */
export function setRememberMe(remember: boolean): void {
    const local = store('local');
    if (!local) return;
    if (remember) local.removeItem(REMEMBER_KEY);
    else local.setItem(REMEMBER_KEY, 'false');
}

/**
 * Routes the session to whichever store the choice implies, and reads from
 * both - so an existing remembered session is still found, and a session that
 * was not remembered is never left behind in localStorage.
 */
const rememberAwareStorage = {
  getItem: (key: string): string | null =>
    store('session')?.getItem(key) ?? store('local')?.getItem(key) ?? memory.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    const remember = isRemembered();
    const target = store(remember ? 'local' : 'session');
    const other = store(remember ? 'session' : 'local');
    other?.removeItem(key);
    if (target) target.setItem(key, value);
    else memory.set(key, value);
  },
  removeItem: (key: string): void => {
    store('local')?.removeItem(key);
    store('session')?.removeItem(key);
    memory.delete(key);
  },
};

export const supabase = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        // Keep the session across reloads and refresh it in the background;
        // this is what makes an account survive closing the app.
        persistSession: true,
        storage: rememberAwareStorage,
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
