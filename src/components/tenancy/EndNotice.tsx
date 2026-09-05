import { useState } from 'react';
import { motion } from 'motion/react';
import { DoorOpen, Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import {
  approveEndTenancy,
  cancelEndRequest,
  requestEndTenancy,
  type DbTenancy,
} from '../../lib/tenancy';
import {
  LANDLORD_REASONS,
  TENANT_REASONS,
  describeReason,
  type EndReason,
} from '../../lib/endReasons';

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * Notice on a tenancy, from whichever side is looking at it.
 *
 * One component for both parties because the rule is the same for both: you
 * may give notice, you may withdraw the notice you gave, and only the other
 * party can agree to it. Writing that twice would be two chances to let the
 * two halves drift apart.
 */
export function EndNotice({
  tenancy,
  viewerId,
  role,
  propertyLabel,
  counterparty,
  onChanged,
}: {
  tenancy: DbTenancy;
  viewerId: string | null;
  role: 'landlord' | 'tenant';
  propertyLabel?: string;
  /** How to name the other party in the copy: "your landlord", a tenant's name. */
  counterparty: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [reasonId, setReasonId] = useState('');
  const [notes, setNotes] = useState('');

  const reasons: EndReason[] = role === 'landlord' ? LANDLORD_REASONS : TENANT_REASONS;
  const outstanding = Boolean(tenancy.end_requested_at) && tenancy.status === 'active';
  const mine = outstanding && tenancy.end_requested_by === viewerId;
  const given = describeReason(tenancy.end_reason);

  const run = (work: Promise<void>, ok: string, description: string) => {
    setBusy(true);
    work
      .then(() => {
        toast.success(ok, { description });
        onChanged();
      })
      .catch(err =>
        toast.error('Could not do that', {
          description: err instanceof Error ? err.message : 'Please try again.',
        }),
      )
      .finally(() => setBusy(false));
  };

  const send = () => {
    if (!reasonId) {
      toast.error('Pick a reason', { description: 'The other party needs to know why.' });
      return;
    }
    setOpen(false);
    run(
      requestEndTenancy(tenancy.id, reasonId, notes.trim()),
      'Notice sent',
      `Nothing changes until ${counterparty} agrees.`,
    );
  };

  if (tenancy.status !== 'active') return null;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          className="shadow-[var(--shadow-md)] border"
          style={{
            borderColor: outstanding
              ? 'color-mix(in srgb, #d97706 45%, transparent)'
              : 'var(--hairline)',
          }}
        >
          <CardContent className="space-y-4 p-5">
            {!outstanding ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Ending this tenancy</p>
                  <p className="text-sm text-muted-foreground">
                    Either of you can give notice. It only takes effect once the
                    other agrees.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="h-11 sm:h-9 rounded-full"
                  onClick={() => setOpen(true)}
                >
                  <DoorOpen className="h-4 w-4" />
                  Give notice
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-600">
                    <DoorOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold tracking-[-0.02em]">
                      {mine
                        ? 'You have given notice'
                        : `${counterparty} has given notice`}
                      {propertyLabel ? ` on ${propertyLabel}` : ''}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Given {day(tenancy.end_requested_at as string)}. The tenancy
                      continues until {mine ? counterparty : 'you'} agree
                      {mine ? 's' : ''}.
                    </p>
                  </div>
                </div>

                {given && (
                  <div className="rounded-2xl border border-[var(--hairline)] p-4">
                    <p className="font-medium">{given.label}</p>
                    {given.guidance && (
                      <p className="mt-1 text-sm text-muted-foreground">{given.guidance}</p>
                    )}
                    {tenancy.end_notes && (
                      <p className="mt-2 text-sm">
                        <span className="text-muted-foreground">In their words: </span>
                        {tenancy.end_notes}
                      </p>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  This is a record between the two of you, not a legal notice.
                  Whatever your agreement says about notice periods still applies.
                </p>

                <div className="flex flex-wrap gap-2">
                  {mine ? (
                    <Button
                      variant="outline"
                      className="h-11 sm:h-9 rounded-full"
                      disabled={busy}
                      onClick={() =>
                        run(
                          cancelEndRequest(tenancy.id),
                          'Notice withdrawn',
                          'The tenancy carries on as before.',
                        )
                      }
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      Withdraw notice
                    </Button>
                  ) : (
                    <Button
                      className="h-11 sm:h-9 rounded-full bg-amber-600 text-white hover:bg-amber-700"
                      disabled={busy}
                      onClick={() =>
                        run(
                          approveEndTenancy(tenancy.id),
                          'Tenancy ended',
                          'The property is marked vacant and the history is kept.',
                        )
                      }
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Agree and end the tenancy
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Give notice on this tenancy</DialogTitle>
            <DialogDescription>
              {counterparty} sees the reason you pick and anything you write.
              Nothing ends until they agree.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reason</Label>
              <RadioGroup value={reasonId} onValueChange={setReasonId} className="space-y-2">
                {reasons.map(r => (
                  <label
                    key={r.id}
                    htmlFor={`reason-${r.id}`}
                    className="flex cursor-pointer gap-3 rounded-xl border border-[var(--hairline)] p-3"
                  >
                    <RadioGroupItem value={r.id} id={`reason-${r.id}`} className="mt-1" />
                    <span>
                      <span className="block font-medium">{r.label}</span>
                      <span className="block text-sm text-muted-foreground">{r.guidance}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-notes">Anything to add</Label>
              <Textarea
                id="end-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Dates, amounts owed, what would put this right."
                rows={3}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Aavas records this between the two of you. It is not a legal notice
              and does not shorten any notice period your agreement sets.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-amber-600 text-white hover:bg-amber-700" onClick={send}>
              Send notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
