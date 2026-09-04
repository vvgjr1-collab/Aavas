import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { useAppState } from './AppState';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  isLiveTenancy,
  listMyProperties,
  listMyTenancies,
  type DbProperty,
  type DbTenancy,
} from '../lib/tenancy';
import { DEMO_VIEW, fetchTenantView, type TenantPropertyView } from '../lib/tenantView';

interface TenancyContextValue {
  /** True once a real answer exists for the current account. */
  ready: boolean;
  properties: DbProperty[];
  tenancies: DbTenancy[];
  /** The tenancy where the signed-in account is the tenant. */
  myTenancy: DbTenancy | null;
  /** Dashboard-shaped view of myTenancy, or the demo flat for guests. */
  view: TenantPropertyView;
  needsTenantSetup: boolean;
  needsLandlordSetup: boolean;
  error: string | null;
  /** Re-read after a write, so a new payment or complaint shows up. */
  refresh: () => void;
}

const TenancyContext = createContext<TenancyContextValue | null>(null);

/**
 * One place that knows what the signed-in account has.
 *
 * Screens used to answer this individually, which meant every tenant route
 * re-fetched the same two tables on mount. Sharing it also means a write can
 * refresh everything at once.
 */
export function TenancyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isGuest, userId } = useAppState();

  const [properties, setProperties] = useState<DbProperty[]>([]);
  const [tenancies, setTenancies] = useState<DbTenancy[]>([]);
  const [view, setView] = useState<TenantPropertyView>(DEMO_VIEW);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [viewReady, setViewReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  // Only a change of account invalidates what is already known. A refresh
  // after a write must not blank the answer: RequireSetup renders nothing
  // while not ready, so flipping it would unmount the dashboard mid-flow and
  // throw away its local state - the "Rent Paid" confirmation the user just
  // earned, for one.
  const accountRef = useRef<string | null>(userId);

  const refresh = useCallback(() => setNonce(n => n + 1), []);

  const demo = isGuest || !isSupabaseConfigured || !isAuthenticated;

  useEffect(() => {
    if (!isSupabaseConfigured || !isAuthenticated) {
      setProperties([]);
      setTenancies([]);
      setLoaded(false);
      setLoading(false);
      return;
    }

    let active = true;
    if (accountRef.current !== userId) {
      accountRef.current = userId;
      setLoaded(false);
    }
    setLoading(true);
    setError(null);

    Promise.all([listMyProperties(), listMyTenancies()])
      .then(([props, tens]) => {
        if (!active) return;
        setProperties(props);
        setTenancies(tens);
      })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, nonce]);

  // Matching on tenant_id being this account matters: a landlord's own let
  // property also has a tenant, and must not be read as one they rent.
  const myTenancy = useMemo(
    () => tenancies.find(t => t.tenant_id === userId && isLiveTenancy(t)) ?? null,
    [tenancies, userId],
  );

  useEffect(() => {
    if (demo || !loaded) {
      setView(DEMO_VIEW);
      setViewReady(demo);
      return;
    }
    // Note: viewReady is not reset here. A refetch replaces the view in place
    // rather than tearing the screen down; see accountRef above.
    if (!myTenancy) {
      setView(DEMO_VIEW);
      setViewReady(true);
      return;
    }

    let active = true;
    fetchTenantView(myTenancy)
      .then(next => {
        if (active) setView(next);
      })
      .catch(() => {
        if (active) setView(DEMO_VIEW);
      })
      .finally(() => {
        if (active) setViewReady(true);
      });

    return () => {
      active = false;
    };
  }, [demo, loaded, myTenancy?.id, myTenancy?.status, myTenancy?.rent, nonce]);

  const answerable = !demo && loaded && !loading && !error;

  const value = useMemo<TenancyContextValue>(
    () => ({
      // Deliberately not gated on `loading`: a background refresh keeps the
      // screen up rather than blanking it.
      ready: demo ? true : loaded && viewReady,
      properties,
      tenancies,
      myTenancy,
      view,
      needsTenantSetup: answerable && !myTenancy,
      needsLandlordSetup: answerable && properties.length === 0,
      error,
      refresh,
    }),
    [demo, loaded, loading, viewReady, properties, tenancies, myTenancy, view, answerable, error, refresh],
  );

  return <TenancyContext.Provider value={value}>{children}</TenancyContext.Provider>;
}

export function useTenancy(): TenancyContextValue {
  const ctx = useContext(TenancyContext);
  if (!ctx) throw new Error('useTenancy must be used within a TenancyProvider');
  return ctx;
}
