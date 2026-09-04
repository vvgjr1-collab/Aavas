import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Property } from '../types/property';
import type { ServiceProvider } from '../types/service';
import type { PropertyFormData } from '../components/PropertyListing';
import { initialProperties } from '../data/properties';

export interface UserData {
  name: string;
  email: string;
}

export type UserRole = 'tenant' | 'landlord';

interface AppState {
  user: UserData | null;
  role: UserRole | null;
  properties: Property[];
  /** Provider chosen on the utilities screen, carried into booking confirmation. */
  bookingProvider: ServiceProvider | null;

  signIn: (user: UserData) => void;
  signOut: () => void;
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

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [bookingProvider, setBookingProvider] = useState<ServiceProvider | null>(null);

  const signIn = useCallback((next: UserData) => setUser(next), []);

  const signOut = useCallback(() => {
    setUser(null);
    setRole(null);
  }, []);

  const chooseRole = useCallback((next: UserRole) => setRole(next), []);
  const clearRole = useCallback(() => setRole(null), []);

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

  const value = useMemo<AppState>(
    () => ({
      user,
      role,
      properties,
      bookingProvider,
      signIn,
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
      properties,
      bookingProvider,
      signIn,
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
