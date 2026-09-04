import { useCallback, useEffect, useState } from 'react';

import { useAppState } from '../context/AppState';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  isLiveTenancy,
  listMyProperties,
  listMyTenancies,
  type DbProperty,
  type DbTenancy,
} from '../lib/tenancy';

export interface OnboardingState {
  loading: boolean;
  /**
   * True once a real answer exists for the current account. Distinct from
   * !loading: between the moment sign-in completes and the moment the effect
   * sets loading, both flags would otherwise say "not loading, nothing found",
   * which reads as "needs setup" for an account that has plenty.
   */
  ready: boolean;
  properties: DbProperty[];
  tenancies: DbTenancy[];
  /** The tenancy this account holds as tenant, if any. */
  myTenancy: DbTenancy | null;
  /** Nothing set up yet for the role in question. */
  needsTenantSetup: boolean;
  needsLandlordSetup: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * What a signed-in account actually has in the database, and therefore whether
 * it still needs to be onboarded.
 *
 * Guests and unconfigured builds never need setup: guest mode is a local demo
 * over the seed data and has nothing to load. Treating it otherwise would push
 * a demo user into a form that cannot save.
 */
export function useOnboarding(): OnboardingState {
  const { isAuthenticated, isGuest } = useAppState();
  const [properties, setProperties] = useState<DbProperty[]>([]);
  const [tenancies, setTenancies] = useState<DbTenancy[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    if (!isSupabaseConfigured || !isAuthenticated) {
      setProperties([]);
      setTenancies([]);
      setLoading(false);
      setLoaded(false);
      return;
    }

    let active = true;
    setLoading(true);
    // Any previous answer belonged to a previous account.
    setLoaded(false);
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

  const myTenancy = tenancies.find(t => t.tenant_id && isLiveTenancy(t)) ?? null;
  const demo = isGuest || !isSupabaseConfigured || !isAuthenticated;
  // A failed read is not evidence that nothing is set up, so it must never
  // route anyone into onboarding they may not need.
  const answerable = !demo && loaded && !loading && !error;

  return {
    loading,
    ready: demo || (loaded && !loading),
    properties,
    tenancies,
    myTenancy,
    needsTenantSetup: answerable && !myTenancy,
    needsLandlordSetup: answerable && properties.length === 0,
    error,
    refresh,
  };
}
