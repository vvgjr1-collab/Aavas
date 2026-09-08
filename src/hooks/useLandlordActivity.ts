import { useEffect, useState } from 'react';

import { listBookings, listComplaints, listPayments, type DbComplaint, type DbPayment } from '../lib/records';
import type { DbTenancy } from '../lib/tenancy';

/**
 * Payments and complaints across a whole portfolio.
 *
 * The panels each read one tenancy; the attention strip has to know about all
 * of them at once, because the point of it is to surface the thing on the
 * property nobody has opened.
 *
 * One request per tenancy, which is fine at the scale a landlord actually has
 * and honest about what it costs. If a portfolio ever grows past that, this is
 * the place a single filtered query replaces the loop.
 */
export function useLandlordActivity(tenancies: DbTenancy[]) {
  const [payments, setPayments] = useState<DbPayment[]>([]);
  const [complaints, setComplaints] = useState<DbComplaint[]>([]);

  const ids = tenancies.map(t => t.id).sort().join(',');

  useEffect(() => {
    if (!ids) {
      setPayments([]);
      setComplaints([]);
      return;
    }
    let active = true;
    const list = ids.split(',');
    Promise.all([
      Promise.all(list.map(id => listPayments(id).catch(() => [] as DbPayment[]))),
      Promise.all(list.map(id => listComplaints(id).catch(() => [] as DbComplaint[]))),
    ])
      .then(([p, c]) => {
        if (!active) return;
        setPayments(p.flat());
        setComplaints(c.flat());
      })
      .catch(() => {
        /* the strip simply shows less rather than breaking the dashboard */
      });
    return () => {
      active = false;
    };
  }, [ids]);

  return { payments, complaints };
}
