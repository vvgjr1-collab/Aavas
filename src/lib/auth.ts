import type { Session, User } from '@supabase/supabase-js';

import { requireSupabase, supabase } from './supabase';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  active_role: 'tenant' | 'landlord' | null;
  onboarding: Record<string, string>;
}

/**
 * Where Supabase should send someone after they click a confirmation link.
 *
 * Has to be built from the running location rather than hardcoded: the same
 * bundle is served from localhost during development, from the /Aavas/ subpath
 * on GitHub Pages, and from a capacitor:// origin inside the Android shell.
 * Each of these must be listed under Authentication -> URL Configuration ->
 * Redirect URLs in the dashboard, or Supabase refuses to redirect there.
 */
export function emailRedirectTo(): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}`;
}

/**
 * Supabase's messages are written for developers. These are the cases a person
 * can actually act on; anything else is passed through rather than flattened
 * into a useless "something went wrong".
 */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return 'That email and password do not match an account.';
  }
  if (m.includes('email not confirmed')) {
    return 'Check your inbox and confirm your email address before signing in.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'An account with that email already exists. Try signing in instead.';
  }
  if (m.includes('password should be at least')) {
    return 'Please choose a longer password.';
  }
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (m.includes('failed to fetch') || m.includes('networkerror')) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  // PKCE keeps the verifier in the browser that asked, so a link opened
  // somewhere else cannot be completed. Say which browser to use.
  if (m.includes('code verifier') || m.includes('code challenge')) {
    return 'Open the reset link in the same browser you requested it from.';
  }
  if (m.includes('expired') || m.includes('invalid') && m.includes('token')) {
    return 'That reset link has expired. Request a new one.';
  }
  if (m.includes('same as the old password') || m.includes('should be different')) {
    return 'Please choose a password you have not used here before.';
  }
  if (m.includes('auth session missing') || m.includes('session_not_found')) {
    return 'This reset link is no longer valid. Request a new one.';
  }
  return message;
}

/**
 * Where the recovery link comes back to.
 *
 * Built from the document URL rather than a constant, so it is right on
 * GitHub Pages under /Aavas/, on localhost, and inside the Android build.
 * Supabase appends ?code=... as a query parameter, which lands *before* the
 * '#' - so HashRouter still routes to /reset-password and the client can find
 * the code. That ordering is the whole reason this app is on the PKCE flow.
 */
export function passwordResetRedirect(): string {
  return `${window.location.href.split('#')[0]}#/reset-password`;
}

/**
 * Send a recovery link.
 *
 * Succeeds whether or not the address has an account: telling a stranger which
 * emails are registered turns this form into a way to enumerate users.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: passwordResetRedirect(),
  });
  if (error) throw new Error(friendlyAuthError(error.message));
}

/**
 * Set a new password for whoever the recovery link signed in.
 *
 * The link carries a code that only becomes a session once exchanged, which
 * the client does on load. Without that session this is just an unauthenticated
 * call and Supabase refuses it - which is what stops a stale tab from changing
 * somebody's password.
 */
export async function updatePassword(password: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error(friendlyAuthError(error.message));
}

export interface SignUpResult {
  /** False when Supabase is waiting for the address to be confirmed. */
  signedIn: boolean;
  email: string;
}

export async function signUpWithEmail(input: {
  name: string;
  email: string;
  password: string;
}): Promise<SignUpResult> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: emailRedirectTo(),
      // Read by the handle_new_user() trigger to seed profiles.full_name.
      data: { full_name: input.name },
    },
  });

  if (error) throw new Error(friendlyAuthError(error.message));

  // With "Confirm email" on, signUp returns a user but no session. Treating
  // that as success and navigating to the dashboard would strand someone on a
  // signed-out screen, so the caller has to know the difference.
  return { signedIn: Boolean(data.session), email: input.email };
}

export async function signInWithEmail(input: {
  email: string;
  password: string;
}): Promise<Session> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) throw new Error(friendlyAuthError(error.message));
  if (!data.session) throw new Error('Signed in, but no session was returned.');
  return data.session;
}

export async function resendConfirmation(email: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: emailRedirectTo() },
  });
  if (error) throw new Error(friendlyAuthError(error.message));
}

export async function signOutEverywhere(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Read the caller's own profile row.
 *
 * The row is created by a trigger on auth.users, but a client can outrun it on
 * a brand-new account, so a missing row is not an error here - the caller falls
 * back to what it knows from the session.
 */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, active_role, onboarding')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[aavas] could not load profile:', error.message);
    return null;
  }
  return (data as Profile) ?? null;
}

/**
 * Read the caller's profile, creating it if it is missing.
 *
 * A profile is normally made by a trigger on auth.users, which only fires at
 * signup. So an account whose profile row disappears - deleted by hand, or
 * created before the trigger existed - is permanently broken: properties and
 * tenancies both reference profiles, and every write fails with
 * "violates foreign key constraint properties_landlord_id_fkey", which tells
 * the person nothing. Recreating it on sign-in costs one query and turns that
 * dead end into something that simply works.
 */
export async function ensureProfile(user: User): Promise<Profile | null> {
  if (!supabase) return null;

  const existing = await fetchProfile(user.id);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email ?? '',
      full_name: (user.user_metadata?.full_name as string | undefined) ?? '',
    })
    .select('id, full_name, email, phone, active_role, onboarding')
    .single();

  if (error) {
    // A race with the trigger, or another tab, is fine - read back what won.
    console.warn('[aavas] could not create the missing profile:', error.message);
    return fetchProfile(user.id);
  }
  return data as Profile;
}

/**
 * Rebuild the signed-in user's profile row, for a write that has just failed
 * because it was missing.
 *
 * Reads the user from the client rather than taking one, so a caller deep in
 * the data layer does not have to thread the session through to reach it.
 */
export async function repairProfile(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  return Boolean(await ensureProfile(data.user));
}

export async function updateProfile(
  userId: string,
  changes: Partial<Pick<Profile, 'full_name' | 'phone' | 'active_role' | 'onboarding'>>,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').update(changes).eq('id', userId);
  if (error) throw new Error(error.message);
}

/** Best available display name, in order of how much we trust it. */
export function displayNameFor(profile: Profile | null, user: User | null): string {
  return (
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'User'
  );
}
