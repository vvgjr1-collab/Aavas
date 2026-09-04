import { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, Home, ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { createTenancyClaim, redeemInvite } from '../../lib/tenancy';

type Mode = 'choose' | 'code' | 'declare' | 'submitted';

interface TenantSetupProps {
  userId: string;
  userName: string;
  onDone: () => void;
  onBack: () => void;
}

const teal = 'var(--tenant-primary)';

/**
 * The first thing a new tenant sees. Its whole job is to produce a tenancy,
 * because until one exists every other tenant screen is about nothing.
 *
 * Two ways in, because you cannot control which side signed up first. The
 * invite path is the good one - the landlord has already set the terms, so
 * joining is instant and everything is agreed. The declare path is the
 * fallback for someone whose landlord is not here yet: it records what they
 * believe the terms are and waits for confirmation, and says so plainly rather
 * than presenting unverified numbers as fact.
 */
export function TenantSetup({ userId, userName, onDone, onBack }: TenantSetupProps) {
  const [mode, setMode] = useState<Mode>('choose');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [landlordEmail, setLandlordEmail] = useState('');
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const submitCode = async () => {
    setBusy(true);
    setError('');
    try {
      await redeemInvite(code);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not use that code.');
    } finally {
      setBusy(false);
    }
  };

  const submitClaim = async () => {
    setBusy(true);
    setError('');
    try {
      await createTenancyClaim(userId, {
        claimed_address: address.trim(),
        claimed_landlord_email: landlordEmail.trim(),
        proposed_rent: rent ? Number(rent) : null,
        proposed_deposit: deposit ? Number(deposit) : null,
        proposed_start_date: startDate || null,
        proposed_end_date: endDate || null,
      });
      setMode('submitted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  };

  const header = (title: string, description: string) => (
    <div className="mb-8 text-center">
      <h1
        className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em]"
        style={{ color: teal }}
      >
        {title}
      </h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );

  if (mode === 'submitted') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-lg"
      >
        <Card className="shadow-[var(--shadow-lg)]">
          <CardHeader className="text-center">
            <div
              className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-2xl"
              style={{ backgroundColor: 'color-mix(in srgb, var(--tenant-primary) 12%, transparent)' }}
            >
              <CheckCircle2 className="h-8 w-8" style={{ color: teal }} />
            </div>
            <CardTitle className="text-2xl">Sent to your landlord</CardTitle>
            <CardDescription>
              We have recorded your tenancy at{' '}
              <span className="font-medium">{address}</span> and told{' '}
              <span className="font-medium">{landlordEmail}</span> it is waiting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You can use the app now. The rent and dates you entered are marked
              as unconfirmed until your landlord agrees them &mdash; whatever
              they confirm against your rent agreement is what counts.
            </p>
            <Button className="w-full text-white" style={{ backgroundColor: teal }} onClick={onDone}>
              Go to my dashboard
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (mode === 'code') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-lg"
      >
        {header('Enter your invite code', 'Your landlord will have sent you one.')}
        <Card className="shadow-[var(--shadow-lg)]">
          <CardContent className="space-y-5 pt-6">
            {error && (
              <Alert className="border-destructive/50 text-destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite code</Label>
              <Input
                id="invite-code"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD-EFGH"
                autoComplete="off"
                className="text-center text-lg tracking-[0.2em] tabular-nums"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setMode('choose')}>
                Back
              </Button>
              <Button
                className="flex-1 text-white"
                style={{ backgroundColor: teal }}
                disabled={code.trim().length < 4 || busy}
                onClick={submitCode}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (mode === 'declare') {
    const ready = address.trim().length > 3 && /.+@.+\..+/.test(landlordEmail);
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-2xl"
      >
        {header('Tell us about your tenancy', 'Your landlord confirms the details afterwards.')}
        <Card className="shadow-[var(--shadow-lg)]">
          <CardContent className="space-y-5 pt-6">
            {error && (
              <Alert className="border-destructive/50 text-destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="claim-address">Property address</Label>
              <Input
                id="claim-address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="123 Sunset Boulevard, Apt 4B, Mumbai"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim-landlord">Landlord&rsquo;s email</Label>
              <Input
                id="claim-landlord"
                type="email"
                value={landlordEmail}
                onChange={e => setLandlordEmail(e.target.value)}
                placeholder="landlord@example.com"
              />
              <p className="text-xs text-muted-foreground">
                We match your tenancy to their account with this, so use the
                address they sign in with.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="claim-rent">Monthly rent (&#8377;)</Label>
                <Input
                  id="claim-rent"
                  inputMode="numeric"
                  value={rent}
                  onChange={e => setRent(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="45000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claim-deposit">Security deposit (&#8377;)</Label>
                <Input
                  id="claim-deposit"
                  inputMode="numeric"
                  value={deposit}
                  onChange={e => setDeposit(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="90000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claim-start">Lease start</Label>
                <Input
                  id="claim-start"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claim-end">Lease end</Label>
                <Input
                  id="claim-end"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              These are your figures for now. Your landlord confirms them
              against the rent agreement, and their version is what the app uses
              from then on.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setMode('choose')}>
                Back
              </Button>
              <Button
                className="flex-1 text-white"
                style={{ backgroundColor: teal }}
                disabled={!ready || busy}
                onClick={submitClaim}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save and continue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-3xl"
    >
      <Button
        aria-label="Go back"
        variant="ghost"
        onClick={onBack}
        className="mb-4 rounded-full gap-2 text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Back</span>
      </Button>

      {header(
        `Welcome, ${userName}`,
        'One step before your dashboard means anything: connect your tenancy.',
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <motion.button
          whileHover={{ y: -4 }}
          onClick={() => setMode('code')}
          className="lift rounded-2xl border border-[var(--hairline)] bg-card p-6 text-left shadow-[var(--shadow-md)]"
        >
          <div
            className="mb-4 grid h-12 w-12 place-items-center rounded-2xl"
            style={{ backgroundColor: teal }}
          >
            <KeyRound className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-lg font-semibold tracking-[-0.02em]" style={{ color: teal }}>
            I have an invite code
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your landlord already added the property. Joining takes a second and
            everything is confirmed from the start.
          </p>
        </motion.button>

        <motion.button
          whileHover={{ y: -4 }}
          onClick={() => setMode('declare')}
          className="lift rounded-2xl border border-[var(--hairline)] bg-card p-6 text-left shadow-[var(--shadow-md)]"
        >
          <div
            className="mb-4 grid h-12 w-12 place-items-center rounded-2xl"
            style={{ backgroundColor: 'var(--tenant-primary-light)' }}
          >
            <Home className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-lg font-semibold tracking-[-0.02em]" style={{ color: teal }}>
            Set it up myself
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your landlord is not on Aavas yet. Tell us where you live and we
            will ask them to confirm it.
          </p>
        </motion.button>
      </div>
    </motion.div>
  );
}
