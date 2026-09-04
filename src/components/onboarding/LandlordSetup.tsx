import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { createInvite, createProperty, createTenancyForProperty } from '../../lib/tenancy';

type Step = 'property' | 'invite';

interface LandlordSetupProps {
  userId: string;
  userName: string;
  onDone: () => void;
  onBack: () => void;
}

const indigo = '#2e3a8c';

/**
 * A landlord's first property, and then the invite that connects a tenant to
 * it. The two belong together: a property with no tenancy is a listing, and
 * the invite is what turns it into a relationship the rest of the app can hang
 * things off.
 *
 * The terms are entered here, by the landlord, once - which is the whole basis
 * of "the landlord's figures win". The tenant accepts them by redeeming the
 * code; nobody has to reconcile two versions afterwards.
 */
export function LandlordSetup({ userId, userName, onDone, onBack }: LandlordSetupProps) {
  const [step, setStep] = useState<Step>('property');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const [title, setTitle] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const ready =
    title.trim().length > 1 && addressLine.trim().length > 3 && rent.trim().length > 0;

  const submitProperty = async () => {
    setBusy(true);
    setError('');
    try {
      const property = await createProperty(userId, {
        title: title.trim(),
        address_line: addressLine.trim(),
        city: city.trim(),
        rent: Number(rent),
        deposit: deposit ? Number(deposit) : 0,
        bedrooms: bedrooms ? Number(bedrooms) : 0,
        bathrooms: bathrooms ? Number(bathrooms) : 0,
      });

      // Open the tenancy and mint the code in one go: a landlord who has just
      // described a property is there to let someone into it.
      const tenancy = await createTenancyForProperty(userId, property.id, {
        rent: Number(rent),
        deposit: deposit ? Number(deposit) : 0,
        start_date: startDate || null,
        end_date: endDate || null,
      });
      const code = await createInvite(tenancy.id, userId);
      setInviteCode(code);
      setStep('invite');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the property.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the code is on screen to read anyway.
    }
  };

  if (step === 'invite') {
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
              style={{ backgroundColor: `color-mix(in srgb, ${indigo} 12%, transparent)` }}
            >
              <Check className="h-8 w-8" style={{ color: indigo }} />
            </div>
            <CardTitle className="text-2xl">{title} is on Aavas</CardTitle>
            <CardDescription>
              Send this code to your tenant. It joins them to this property with
              the terms you just set.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div
              className="rounded-2xl border border-dashed p-6 text-center"
              style={{ borderColor: `color-mix(in srgb, ${indigo} 35%, transparent)` }}
            >
              <p className="text-3xl font-semibold tracking-[0.18em] tabular-nums" style={{ color: indigo }}>
                {inviteCode}
              </p>
              <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={copy}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy code
                  </>
                )}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              The code works once and expires in 14 days. You can issue another
              from the property at any time.
            </p>

            <Button
              className="w-full text-white"
              style={{ backgroundColor: indigo }}
              onClick={onDone}
            >
              Go to my portfolio
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-2xl"
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

      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl shadow-[var(--shadow-sm)]"
          style={{ backgroundColor: indigo }}
        >
          <Building2 className="h-7 w-7 text-white" />
        </div>
        <h1
          className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em]"
          style={{ color: indigo }}
        >
          Add your first property
        </h1>
        <p className="mt-2 text-muted-foreground">
          Welcome, {userName}. Your portfolio starts here.
        </p>
      </div>

      <Card className="shadow-[var(--shadow-lg)]">
        <CardContent className="space-y-5 pt-6">
          {error && (
            <Alert className="border-destructive/50 text-destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="prop-title">Property name</Label>
            <Input
              id="prop-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Modern 2BHK Apartment"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <Label htmlFor="prop-address">Address</Label>
              <Input
                id="prop-address"
                value={addressLine}
                onChange={e => setAddressLine(e.target.value)}
                placeholder="Sector 18"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-city">City</Label>
              <Input
                id="prop-city"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Noida"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prop-rent">Monthly rent (&#8377;)</Label>
              <Input
                id="prop-rent"
                inputMode="numeric"
                value={rent}
                onChange={e => setRent(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="25000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-deposit">Security deposit (&#8377;)</Label>
              <Input
                id="prop-deposit"
                inputMode="numeric"
                value={deposit}
                onChange={e => setDeposit(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="50000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-beds">Bedrooms</Label>
              <Input
                id="prop-beds"
                inputMode="numeric"
                value={bedrooms}
                onChange={e => setBedrooms(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-baths">Bathrooms</Label>
              <Input
                id="prop-baths"
                inputMode="numeric"
                value={bathrooms}
                onChange={e => setBathrooms(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-start">Lease start</Label>
              <Input
                id="prop-start"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-end">Lease end</Label>
              <Input
                id="prop-end"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            These are the agreed terms. Your tenant joins on them, so they never
            have to be reconciled later.
          </p>

          <Button
            className="w-full text-white"
            style={{ backgroundColor: indigo }}
            disabled={!ready || busy}
            onClick={submitProperty}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Save and get an invite code
                <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
