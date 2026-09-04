import { useState } from 'react';
import { motion } from 'motion/react';
import { DoorOpen, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { approveEndTenancy, type DbTenancy } from '../../lib/tenancy';
import type { Property } from '../../types/property';

const indigo = '#2e3a8c';

/**
 * The landlord half of leaving.
 *
 * A tenant can only ask; the tenancy stays active until this is approved. That
 * is the point - neither side can end an agreement on their own, so a tenant
 * cannot vanish from the record and a landlord cannot evict by button.
 */
export function EndRequests({
  tenancies,
  properties,
  onChanged,
}: {
  tenancies: DbTenancy[];
  properties: Property[];
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const requests = tenancies.filter(
    t => t.status === 'active' && t.end_requested_at,
  );
  if (requests.length === 0) return null;

  const approve = (t: DbTenancy) => {
    setBusyId(t.id);
    approveEndTenancy(t.id)
      .then(() => {
        toast.success('Tenancy ended', {
          description: 'The property is marked vacant and the history is kept.',
        });
        onChanged();
      })
      .catch(err => toast.error('Could not end it', { description: err.message }))
      .finally(() => setBusyId(null));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className="shadow-[var(--shadow-md)] border"
        style={{ borderColor: 'color-mix(in srgb, #d97706 45%, transparent)' }}
      >
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-600">
              <DoorOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold tracking-[-0.02em]" style={{ color: indigo }}>
                {requests.length === 1
                  ? 'A tenant has asked to leave'
                  : `${requests.length} tenants have asked to leave`}
              </h2>
              <p className="text-sm text-muted-foreground">
                Their tenancy stays active until you approve it.
              </p>
            </div>
          </div>

          {requests.map(t => {
            const property = properties.find(p => p.id === t.property_id);
            return (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--hairline)] p-4"
              >
                <div>
                  <p className="font-medium">{property?.title ?? 'A property'}</p>
                  <p className="text-sm text-muted-foreground">
                    {property?.tenant?.name ?? 'Your tenant'} · asked on{' '}
                    {new Date(t.end_requested_at as string).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-11 sm:h-8 bg-amber-600 text-white hover:bg-amber-700"
                  disabled={busyId === t.id}
                  onClick={() => approve(t)}
                >
                  {busyId === t.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      End the tenancy
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
