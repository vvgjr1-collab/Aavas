import { useEffect, useState } from 'react';

import { useOnboarding } from './useOnboarding';
import { DEMO_VIEW, fetchTenantView, type TenantPropertyView } from '../lib/tenantView';

/**
 * The tenant dashboard's data, from the real tenancy when there is one and
 * from the demo flat otherwise.
 *
 * Guest mode has no tenancy and never will, so it gets the seed data rather
 * than an empty screen - the demo has to keep reading well. `ready` lets the
 * screen hold still instead of rendering the demo flat for a second and then
 * swapping it for the real one.
 */
export function useTenantView(): { view: TenantPropertyView; ready: boolean } {
  const { myTenancy, ready: onboardingReady } = useOnboarding();
  const [view, setView] = useState<TenantPropertyView>(DEMO_VIEW);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!onboardingReady) {
      setReady(false);
      return;
    }
    if (!myTenancy) {
      setView(DEMO_VIEW);
      setReady(true);
      return;
    }

    let active = true;
    setReady(false);
    fetchTenantView(myTenancy)
      .then(next => {
        if (active) setView(next);
      })
      .catch(() => {
        // A read that fails should not silently present the demo flat as if it
        // were this person's tenancy, but there is nothing better to show.
        if (active) setView(DEMO_VIEW);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [onboardingReady, myTenancy?.id, myTenancy?.status]);

  return { view, ready };
}
