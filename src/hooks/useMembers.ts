import { useEffect, useState } from 'react';

import { listMembers, type TenancyMember } from '../lib/tenancy';

/**
 * Everyone on a tenancy - flatmates included.
 *
 * The landlord reads these through the profiles policy, which lets the two
 * sides of a tenancy see each other and nobody else.
 */
export function useMembers(tenancyId: string | null | undefined) {
  const [members, setMembers] = useState<TenancyMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenancyId) {
      setMembers([]);
      return;
    }
    let active = true;
    setLoading(true);
    listMembers(tenancyId)
      .then(rows => {
        if (active) setMembers(rows);
      })
      .catch(() => {
        /* the list stays empty rather than breaking the page */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tenancyId]);

  return { members, loading };
}
