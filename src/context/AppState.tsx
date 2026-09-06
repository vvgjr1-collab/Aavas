import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import type { Property } from '../types/property';
import type { ServiceProvider } from '../types/service';
import type { PropertyFormData } from '../components/PropertyListing';
import { initialProperties } from '../data/properties';
import { supabase, isSupabaseConfigured, setRememberMe } from '../lib/supabase';
import {
  displayNameFor,
  ensureProfile,
  signInWithEmail,
  signOutEverywhere,
  signUpWithEmail,
  updateProfile,
  type Profile,
  type SignUpResult,
} from '../lib/auth';

export interface UserData {
  name: string;
  email: string;
}

export type UserRole = 'tenant' | 'landlord';

interface AppState {
  user: UserData | null;
  /** The Supabase auth id, or null for guests. Rows are keyed by this. */
  userId: string | null;
  role: UserRole | null;
  /** True until the stored session has been checked, so guards do not flash. */
  isLoadingSession: boolean;
  /** A guest is a local demo user with no account and no database access. */
  isGuest: boolean;
  /** Signed in against Supabase, as opposed to a guest. */
  isAuthenticated: boolean;

  properties: Property[];
  /** Provider chosen on the utilities screen, carried into booking confirmation. */
  bookingProvider: ServiceProvider | null;

  signUp: (input: { name: string; email: string; password: string }) => Promise<SignUpResult>;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  chooseRole: (role: UserRole) => void;
  clearRole: () => void;
  setBookingProvider: (provider: ServiceProvider | null) => void;
  addProperty: (form: PropertyFormData) => void;
  updateProperty: (id: string, changes: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
}

const AppStateContext = createContext<AppState | null>(null);

const today = () => new Date().toISOString().split('T')[0];

const FALLBACK_PROPERTY_IMAGE =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400';

const GUEST: UserData = { name: 'Guest User', email: 'guest@aavas.com' };

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  // Starts true so nothing renders a signed-out view during the moment it
  // takes to read the persisted session back from storage.
  const [isLoadingSession, setIsLoadingSession] = useState(isSupabaseConfigured);

  // Role lives on the profile so it survives a reload. Guests, who have no
  // profile, keep it here for the session only.
  const [guestRole, setGuestRole] = useState<UserRole | null>(null);

  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [bookingProvider, setBookingProvider] = useState<ServiceProvider | null>(null);

  // Restore the stored session, then follow it. onAuthStateChange also fires
  // after the PKCE code in the URL is exchanged, which is how a user who has
  // just clicked an email confirmation link ends up signed in.
  useEffect(() => {
    if (!supabase) {
      setIsLoadingSession(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsLoadingSession(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      setIsLoadingSession(false);
      if (next) setIsGuest(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load the profile whenever the signed-in user changes, creating it if it
  // has gone missing - see ensureProfile.
  useEffect(() => {
    const user = session?.user;
    if (!user) {
      setProfile(null);
      return;
    }
    let active = true;
    ensureProfile(user).then(next => {
      if (active) setProfile(next);
    });
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const signUp = useCallback(
    (input: { name: string; email: string; password: string }) => {
      // A new account starts remembered. Without this it would inherit a
      // "false" left behind by someone who signed in here once without
      // ticking the box, and be quietly signed out when the browser closed.
      setRememberMe(true);
      return signUpWithEmail(input);
    },
    [],
  );

  const signIn = useCallback(async (input: { email: string; password: string }) => {
    const next = await signInWithEmail(input);
    setSession(next);
    setIsGuest(false);
  }, []);

  const signInAsGuest = useCallback(() => {
    setIsGuest(true);
    setGuestRole(null);
  }, []);

  const signOut = useCallback(async () => {
    setIsGuest(false);
    setGuestRole(null);
    setProfile(null);
    setSession(null);
    await signOutEverywhere();
  }, []);

  const chooseRole = useCallback(
    (next: UserRole) => {
      setGuestRole(next);
      const userId = session?.user?.id;
      if (!userId) return;
      // Optimistic: the dashboard should not wait on a round trip to open.
      setProfile(prev => (prev ? { ...prev, active_role: next } : prev));
      updateProfile(userId, { active_role: next }).catch(err =>
        console.warn('[aavas] could not persist role:', err.message),
      );
    },
    [session?.user?.id],
  );

  const clearRole = useCallback(() => {
    setGuestRole(null);
    const userId = session?.user?.id;
    if (!userId) return;
    setProfile(prev => (prev ? { ...prev, active_role: null } : prev));
    updateProfile(userId, { active_role: null }).catch(err =>
      console.warn('[aavas] could not clear role:', err.message),
    );
  }, [session?.user?.id]);

  const addProperty = useCallback((form: PropertyFormData) => {
    const property: Property = {
      id: Date.now().toString(),
      title: form.title,
      address: `${form.address}, ${form.city}, ${form.state} ${form.pincode}`,
      type: form.type as Property['type'],
      rent: parseInt(form.rent),
      deposit: parseInt(form.deposit),
      bedrooms: parseInt(form.bedrooms),
      bathrooms: parseInt(form.bathrooms),
      area: parseInt(form.area),
      status: 'vacant',
      amenities: form.amenities,
      images: form.images.length > 0 ? form.images : [FALLBACK_PROPERTY_IMAGE],
      rating: 0,
      lastUpdated: today(),
    };
    setProperties(prev => [...prev, property]);
  }, []);

  const updateProperty = useCallback((id: string, changes: Partial<Property>) => {
    setProperties(prev =>
      prev.map(p => (p.id === id ? { ...p, ...changes, lastUpdated: today() } : p))
    );
  }, []);

  const deleteProperty = useCallback((id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));
  }, []);

  const user = useMemo<UserData | null>(() => {
    if (session?.user) {
      return {
        name: displayNameFor(profile, session.user),
        email: profile?.email || session.user.email || '',
      };
    }
    return isGuest ? GUEST : null;
  }, [session, profile, isGuest]);

  const role = session?.user ? (profile?.active_role ?? guestRole) : guestRole;

  const value = useMemo<AppState>(
    () => ({
      user,
      userId: session?.user?.id ?? null,
      role,
      isLoadingSession,
      isGuest,
      isAuthenticated: Boolean(session?.user),
      properties,
      bookingProvider,
      signUp,
      signIn,
      signInAsGuest,
      signOut,
      chooseRole,
      clearRole,
      setBookingProvider,
      addProperty,
      updateProperty,
      deleteProperty,
    }),
    [
      user,
      role,
      isLoadingSession,
      isGuest,
      session,
      properties,
      bookingProvider,
      signUp,
      signIn,
      signInAsGuest,
      signOut,
      chooseRole,
      clearRole,
      addProperty,
      updateProperty,
      deleteProperty,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider');
  return ctx;
}

/** Display helpers matching the previous AuthContainer fallbacks. */
export function useDisplayUser() {
  const { user } = useAppState();
  return {
    userName: user?.name || 'User',
    userEmail: user?.email || 'user@example.com',
  };
}
