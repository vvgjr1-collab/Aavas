import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { confirmTenancy, rejectTenancyClaim, type DbTenancy } from '../../lib/tenancy';
import type { Property } from '../../types/property';

const indigo = '#2e3a8c';

interface PendingClaimsProps {
  claims: DbTenancy[];
  properties: Property[];
  onChanged: () => void;
}

/**
 * The landlord half of the tenant-first path.
 *
 * A tenant who signed up before their landlord left a claim addressed to this
 * account's email. Until it is confirmed it exists only on the tenant's side,
 * so this is the one place it can be turned into a real tenancy - and the one
 * place the landlord's figures are set, which is what makes them the agreed
 * ones.
 */
export function PendingClaims({ claims, properties, onChanged }: PendingClaimsProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [propertyId, setPropertyId] = useState('');
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (claims.length === 0) return null;

  const open = (claim: DbTenancy) => {
    setOpenId(claim.id);
    // Pre-fill from what the tenant proposed. It is a starting point to
    // correct, not a value to accept blindly.
    setRent(claim.proposed_rent ? String(claim.proposed_rent) : '');
    setDeposit(claim.proposed_deposit ? String(claim.proposed_deposit) : '');
    setStartDate(claim.proposed_start_date ?? '');
    setEndDate(claim.proposed_end_date ?? '');
    setPropertyId(properties[0]?.id ?? '');
  };

  const confirm = (claim: DbTenancy) => {
    if (!propertyId) {
      toast.error('Choose which property this tenancy is for');
      return;
    }
    setBusy(true);
    confirmTenancy({
      tenancyId: claim.id,
      propertyId,
      rent: Number(rent) || 0,
      deposit: Number(deposit) || 0,
      startDate: startDate || null,
      endDate: endDate || null,
    })
      .then(() => {
        toast.success('Tenancy confirmed', {
          description: 'Your figures are now the agreed terms.',
        });
        setOpenId(null);
        onChanged();
      })
      .catch(err => toast.error('Could not confirm', { description: err.message }))
      .finally(() => setBusy(false));
  };

  const reject = (claim: DbTenancy) => {
    setBusy(true);
    rejectTenancyClaim(claim.id)
      .then(() => {
        toast.success('Claim rejected');
        onChanged();
      })
      .catch(err => toast.error('Could not reject', { description: err.message }))
      .finally(() => setBusy(false));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className="shadow-[var(--shadow-md)] border"
        style={{ borderColor: 'color-mix(in srgb, #ff914d 45%, transparent)' }}
      >
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
              style={{ backgroundColor: '#ff914d' }}
            >
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold tracking-[-0.02em]" style={{ color: indigo }}>
                {claims.length === 1
                  ? 'A tenant is waiting for you'
                  : `${claims.length} tenants are waiting for you`}
              </h2>
              <p className="text-sm text-muted-foreground">
                They set their tenancy up before you joined. Confirm the terms to
                connect them.
              </p>
            </div>
          </div>

          {claims.map(claim => (
            <div
              key={claim.id}
              className="rounded-2xl border border-[var(--hairline)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{claim.claimed_address}</p>
                  <p className="text-sm text-muted-foreground">
                    They say {claim.proposed_rent ? `₹${Number(claim.proposed_rent).toLocaleString('en-IN')}/month` : 'no rent given'}
                    {claim.proposed_deposit
                      ? `, ₹${Number(claim.proposed_deposit).toLocaleString('en-IN')} deposit`
                      : ''}
                  </p>
                </div>
                {openId !== claim.id && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-11 sm:h-8 text-white"
                      style={{ backgroundColor: indigo }}
                      onClick={() => open(claim)}
                    >
                      Review
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 sm:h-8"
                      disabled={busy}
                      onClick={() => reject(claim)}
                    >
                      <X className="h-4 w-4" />
                      Not mine
                    </Button>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {openId === claim.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor={`prop-${claim.id}`}>Which property is this?</Label>
                        <Select value={propertyId} onValueChange={setPropertyId}>
                          <SelectTrigger id={`prop-${claim.id}`}>
                            <SelectValue placeholder="Choose a property" />
                          </SelectTrigger>
                          <SelectContent>
                            {properties.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`rent-${claim.id}`}>Agreed rent (&#8377;)</Label>
                          <Input
                            id={`rent-${claim.id}`}
                            inputMode="numeric"
                            value={rent}
                            onChange={e => setRent(e.target.value.replace(/[^0-9]/g, ''))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`dep-${claim.id}`}>Agreed deposit (&#8377;)</Label>
                          <Input
                            id={`dep-${claim.id}`}
                            inputMode="numeric"
                            value={deposit}
                            onChange={e => setDeposit(e.target.value.replace(/[^0-9]/g, ''))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`start-${claim.id}`}>Lease start</Label>
                          <Input
                            id={`start-${claim.id}`}
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`end-${claim.id}`}>Lease end</Label>
                          <Input
                            id={`end-${claim.id}`}
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                          />
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        What you enter here becomes the agreed terms. The tenant&rsquo;s
                        figures are kept as a record of what they claimed.
                      </p>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setOpenId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1 text-white"
                          style={{ backgroundColor: indigo }}
                          disabled={busy}
                          onClick={() => confirm(claim)}
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4" />
                              Confirm tenancy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
