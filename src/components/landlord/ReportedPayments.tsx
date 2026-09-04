import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { IndianRupee, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { supabase } from '../../lib/supabase';
import type { DbPayment } from '../../lib/records';
import type { DbTenancy } from '../../lib/tenancy';

const indigo = '#2e3a8c';

/**
 * The other half of the payment flow.
 *
 * A tenant records what they paid as 'reported' - they cannot mark it received,
 * by policy. Without somewhere for the landlord to confirm it, every payment
 * would sit unacknowledged forever and the tenant's "Total Paid" would stay at
 * zero however much they had actually paid.
 */
export function ReportedPayments({
  tenancies,
  onChanged,
}: {
  tenancies: DbTenancy[];
  onChanged: () => void;
}) {
  const [payments, setPayments] = useState<DbPayment[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const tenancyIds = tenancies.map(t => t.id).join(',');

  useEffect(() => {
    if (!supabase || tenancies.length === 0) {
      setPayments([]);
      return;
    }
    let active = true;
    supabase
      .from('payments')
      .select('id, tenancy_id, amount, due_date, paid_at, method, reference, status, recorded_by, created_at')
      .eq('status', 'reported')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) setPayments((data ?? []) as DbPayment[]);
      });
    return () => {
      active = false;
    };
  }, [tenancyIds]);

  if (payments.length === 0) return null;

  const confirmReceipt = (payment: DbPayment) => {
    if (!supabase) return;
    setBusyId(payment.id);
    supabase
      .from('payments')
      .update({ status: 'paid', paid_at: payment.paid_at ?? new Date().toISOString() })
      .eq('id', payment.id)
      .then(({ error }) => {
        if (error) {
          toast.error('Could not confirm the payment', { description: error.message });
        } else {
          setPayments(prev => prev.filter(p => p.id !== payment.id));
          toast.success('Payment confirmed', {
            description: 'Your tenant will see it as received.',
          });
          onChanged();
        }
        setBusyId(null);
      });
  };

  const money = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className="shadow-[var(--shadow-md)] border"
        style={{ borderColor: 'color-mix(in srgb, #16a34a 40%, transparent)' }}
      >
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-green-600">
              <IndianRupee className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold tracking-[-0.02em]" style={{ color: indigo }}>
                {payments.length === 1
                  ? 'A payment is waiting to be confirmed'
                  : `${payments.length} payments waiting to be confirmed`}
              </h2>
              <p className="text-sm text-muted-foreground">
                Your tenant has recorded these. Confirm the ones you have received.
              </p>
            </div>
          </div>

          {payments.map(p => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--hairline)] p-4"
            >
              <div>
                <p className="text-lg font-semibold tracking-[-0.02em]" style={{ color: indigo }}>
                  {money(p.amount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {p.method || 'Payment'}
                  {p.reference ? ` · ${p.reference}` : ''} ·{' '}
                  {new Date(p.paid_at ?? p.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <Button
                size="sm"
                className="h-11 sm:h-8 bg-green-600 text-white hover:bg-green-700"
                disabled={busyId === p.id}
                onClick={() => confirmReceipt(p)}
              >
                {busyId === p.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirm receipt
                  </>
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
