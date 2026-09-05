import { useCallback, useEffect, useState } from 'react';

import { listPayments, type DbPayment } from '../lib/records';

/**
 * The payments on one tenancy, for whichever side of it is looking.
 *
 * Row Level Security narrows the read to the tenancy's own parties, so the
 * landlord's property page and the tenant's dashboard run the same query and
 * get the same rows - which is the point: the two screens used to disagree
 * because each was reading a hardcoded array of its own.
 */
export function usePayments(tenancyId: string | null | undefined) {
  const [payments, setPayments] = useState<DbPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    if (!tenancyId) {
      setPayments([]);
      return;
    }
    let active = true;
    setLoading(true);
    listPayments(tenancyId)
      .then(rows => {
        if (active) setPayments(rows);
      })
      .catch(() => {
        /* an empty list reads correctly as "nothing recorded yet" */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tenancyId, nonce]);

  return { payments, loading, reload };
}
