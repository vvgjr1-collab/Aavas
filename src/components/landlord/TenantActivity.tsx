import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Wrench, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { supabase } from '../../lib/supabase';
import {
  listBookings,
  listComplaints,
  type DbBooking,
  type DbComplaint,
} from '../../lib/records';
import type { DbTenancy } from '../../lib/tenancy';

const indigo = '#2e3a8c';

const COMPLAINT_TONE: Record<string, { bg: string; fg: string }> = {
  open: { bg: 'rgba(217, 119, 6, 0.16)', fg: '#b45309' },
  in_progress: { bg: 'rgba(37, 99, 235, 0.14)', fg: '#1d4ed8' },
  resolved: { bg: 'rgba(22, 163, 74, 0.14)', fg: '#15803d' },
  closed: { bg: 'rgba(100, 116, 139, 0.16)', fg: '#475569' },
};

const PRIORITY_TONE: Record<string, string> = {
  urgent: '#b91c1c',
  high: '#c2410c',
  medium: '#a16207',
  low: '#475569',
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * What the tenant has raised, on the property the landlord is looking at.
 *
 * Complaints and bookings were written to the database and shown to the
 * tenant, but never to the person who has to act on them - so a maintenance
 * request could sit unread forever while the tenant watched it say "open".
 * The status control is here for the same reason: seeing a complaint without
 * being able to move it on is only half an answer.
 */
export function TenantActivity({ tenancy }: { tenancy: DbTenancy | null }) {
  const [complaints, setComplaints] = useState<DbComplaint[]>([]);
  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!tenancy) {
      setComplaints([]);
      setBookings([]);
      return;
    }
    setLoading(true);
    Promise.all([listComplaints(tenancy.id), listBookings(tenancy.id)])
      .then(([c, b]) => {
        setComplaints(c);
        setBookings(b);
      })
      .catch(() => {
        /* the panel stays empty rather than breaking the page */
      })
      .finally(() => setLoading(false));
  }, [tenancy?.id]);

  useEffect(load, [load]);

  const setStatus = (complaint: DbComplaint, status: string) => {
    if (!supabase) return;
    setBusyId(complaint.id);
    supabase
      .from('complaints')
      .update({
        status,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', complaint.id)
      .then(({ error }) => {
        if (error) {
          toast.error('Could not update the complaint', { description: error.message });
        } else {
          setComplaints(prev =>
            prev.map(c => (c.id === complaint.id ? { ...c, status } : c)),
          );
          toast.success(status === 'resolved' ? 'Marked resolved' : 'Marked in progress');
        }
        setBusyId(null);
      });
  };

  const openCount = complaints.filter(c => c.status === 'open').length;

  // Listing a property creates a tenancy row before anyone has joined it, so
  // the row existing is not the same as somebody living there - and "nothing
  // reported" would read as though a tenant had simply been quiet.
  const occupied = Boolean(tenancy?.tenant_id);

  return (
    <Card className="shadow-[var(--shadow-md)] border border-[#2e3a8c]/25">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
            style={{ backgroundColor: indigo }}
          >
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg" style={{ color: indigo }}>
              From your tenant
            </CardTitle>
            <CardDescription>
              {openCount > 0
                ? `${openCount} complaint${openCount === 1 ? '' : 's'} waiting on you`
                : 'Complaints and service bookings raised on this property'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/*
          Returning null here used to remove the whole card, so a landlord with
          no tenant yet had no way to tell whether this existed at all. Say so
          instead.
        */}
        {!occupied && (
          <p className="text-sm text-muted-foreground">
            Nobody has joined this property yet. Complaints and service bookings
            your tenant raises will appear here.
          </p>
        )}

        {occupied && (
        <>
        <section className="space-y-3">
          <h3 className="text-sm font-semibold" style={{ color: indigo }}>
            Complaints
          </h3>

          {loading && complaints.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : complaints.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing reported.</p>
          ) : (
            <ul className="space-y-3">
              {complaints.map(c => {
                const tone = COMPLAINT_TONE[c.status] ?? COMPLAINT_TONE.open;
                return (
                  <li
                    key={c.id}
                    className="rounded-2xl border border-[var(--hairline)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium capitalize">{c.title || c.category}</p>
                          <Badge
                            style={{ backgroundColor: tone.bg, color: tone.fg }}
                            className="capitalize"
                          >
                            {c.status.replace('_', ' ')}
                          </Badge>
                          <span
                            className="text-xs font-medium capitalize"
                            style={{ color: PRIORITY_TONE[c.priority] ?? '#475569' }}
                          >
                            {c.priority}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Reported {day(c.created_at)}
                        </p>
                      </div>

                      {c.status !== 'resolved' && c.status !== 'closed' && (
                        <div className="flex shrink-0 gap-2">
                          {c.status === 'open' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-11 sm:h-8"
                              disabled={busyId === c.id}
                              onClick={() => setStatus(c, 'in_progress')}
                            >
                              {busyId === c.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Start'
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="h-11 sm:h-8 bg-green-600 text-white hover:bg-green-700"
                            disabled={busyId === c.id}
                            onClick={() => setStatus(c, 'resolved')}
                          >
                            {busyId === c.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4" />
                                Resolve
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: indigo }}>
            <Wrench className="h-4 w-4" />
            Service bookings
          </h3>

          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">None booked.</p>
          ) : (
            <ul className="space-y-2">
              {bookings.map(b => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--hairline)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{b.provider_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.notes || b.category || 'Service request'} · {day(b.created_at)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {b.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
        </>
        )}
      </CardContent>
    </Card>
  );
}
