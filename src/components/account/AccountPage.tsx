import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Check,
  Circle,
  Loader2,
  LogOut,
  Mail,
  Repeat,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { completionFor, looksLikePhone, type Completion } from '../../lib/profileCompletion';
import { sendPasswordReset } from '../../lib/auth';
import type { DeletionBlock, Profile } from '../../lib/auth';
import { DeleteAccount } from './DeleteAccount';

/**
 * The account, and the things sign-up could not reasonably ask for.
 *
 * Sign-up takes a name, an email and a password, because a longer form is a
 * form people abandon. That leaves a real gap: nobody has a phone number for
 * anybody, and the rent agreement is nowhere. A percentage is not decoration
 * here - it is the only thing that tells someone their account is unfinished,
 * and each step says who it matters to rather than just what is missing.
 */
export function AccountPage({
  profile,
  email,
  role,
  completion,
  saving,
  onSave,
  onSwitchRole,
  onSignOut,
  onBack,
  onGo,
  onGoToNotice,
  onDeleted,
}: {
  profile: Profile | null;
  email: string;
  role: 'tenant' | 'landlord' | null;
  completion: Completion;
  saving: boolean;
  onSave: (changes: { full_name: string; phone: string }) => Promise<void>;
  onSwitchRole: () => void;
  onSignOut?: () => void;
  onBack: () => void;
  onGo: (href: string) => void;
  /** Takes them to where notice is given, on the side the tenancy blocks. */
  onGoToNotice: (block: DeletionBlock) => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile?.full_name, profile?.phone]);

  const dirty =
    name.trim() !== (profile?.full_name ?? '').trim() ||
    phone.trim() !== (profile?.phone ?? '').trim();

  const save = async () => {
    if (!name.trim()) {
      toast.error('A name is needed', {
        description: 'The other party sees this instead of your email address.',
      });
      return;
    }
    if (phone.trim() && !looksLikePhone(phone)) {
      toast.error('That does not look like a phone number', {
        description: 'Use 8 to 15 digits, with or without a country code.',
      });
      return;
    }
    await onSave({ full_name: name.trim(), phone: phone.trim() });
  };

  const resetPassword = async () => {
    setResetting(true);
    try {
      await sendPasswordReset(email);
      toast.success('Check your email', {
        description: 'A link to set a new password is on its way.',
      });
    } catch (err) {
      toast.error('Could not send the link', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6"
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          aria-label="Go back"
          onClick={onBack}
          className="-ml-2 rounded-full text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Your account</h1>
          <p className="text-sm text-muted-foreground">
            {role ? `Signed in as a ${role}` : 'Signed in'}
          </p>
        </div>
      </div>

      <Card className="shadow-[var(--shadow-md)]">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Account setup</CardTitle>
              <CardDescription>
                {completion.percent === 100
                  ? 'Everything that matters is filled in.'
                  : 'A few things are still missing.'}
              </CardDescription>
            </div>
            <Badge variant={completion.percent === 100 ? 'default' : 'secondary'}>
              {completion.percent}% complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={completion.percent} aria-label="Account completeness" />

          <ul className="space-y-2">
            {completion.steps.map(step => (
              <li
                key={step.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--hairline)] p-3"
              >
                <div className="flex min-w-0 gap-3">
                  {step.done ? (
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <p className={step.done ? 'text-muted-foreground line-through' : 'font-medium'}>
                      {step.label}
                    </p>
                    {!step.done && (
                      <p className="text-sm text-muted-foreground">{step.why}</p>
                    )}
                  </div>
                </div>
                {!step.done && step.href && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 shrink-0 rounded-full sm:h-8"
                    onClick={() => onGo(step.href as string)}
                  >
                    {step.id === 'phone' || step.id === 'name' ? 'Below' : 'Go'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-md)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Your details</CardTitle>
          <CardDescription>
            The other party to your tenancy can see these. Nobody else can.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-name">Full name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-phone">Phone number</Label>
            <Input
              id="account-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="+91 98765 43210"
            />
            <p className="text-xs text-muted-foreground">
              Sign-up does not ask for this, and without it the other party has
              no way to reach you quickly.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-email">Email address</Label>
            <Input id="account-email" value={email} readOnly disabled />
            <p className="text-xs text-muted-foreground">
              This is how you sign in, so it cannot be changed here yet.
            </p>
          </div>

          <Button onClick={save} disabled={!dirty || saving} className="h-11 rounded-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-md)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Settings</CardTitle>
          <CardDescription>Sign-in and how you are using Aavas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">
                  We email a link rather than asking for the old one.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="h-11 rounded-full sm:h-9"
              disabled={resetting}
              onClick={resetPassword}
            >
              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send reset link
            </Button>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Repeat className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Switch role</p>
                <p className="text-sm text-muted-foreground">
                  One account can be a landlord on one property and a tenant on
                  another.
                </p>
              </div>
            </div>
            <Button variant="outline" className="h-11 rounded-full sm:h-9" onClick={onSwitchRole}>
              Switch
            </Button>
          </div>

          {onSignOut && (
            <>
              <Separator />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <LogOut className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Sign out</p>
                    <p className="text-sm text-muted-foreground">
                      Ends the session on this device.
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="h-11 rounded-full sm:h-9" onClick={onSignOut}>
                  Sign out
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-md)] border border-destructive/25">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-destructive">Closing your account</CardTitle>
          <CardDescription>
            Available once no tenancy is live. What happens to your records is
            set out in the{' '}
            <button className="underline" onClick={() => onGo('/privacy')}>
              privacy policy
            </button>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccount
            email={email}
            onGoToNotice={onGoToNotice}
            onDeleted={onDeleted}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
