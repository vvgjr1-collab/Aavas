import { useEffect, useState } from 'react';
import { Loader2, MailCheck } from 'lucide-react';

import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { sendPasswordReset } from '../../lib/auth';

const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/**
 * Asking for a recovery link.
 *
 * The confirmation is the same whether or not the address has an account. It
 * has to be: a form that says "no account with that email" is a way for anyone
 * to find out who has signed up here.
 */
export function ForgotPasswordDialog({
  open,
  onOpenChange,
  initialEmail = '',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefilled from whatever they had already typed on the sign-in form. */
  initialEmail?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setEmail(initialEmail);
    setSent(false);
    setError('');
  }, [open, initialEmail]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!looksLikeEmail(email)) {
      setError('Enter the email address you signed up with.');
      return;
    }
    setSending(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the link.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {sent ? (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
                <MailCheck className="h-7 w-7 text-primary" />
              </div>
              <DialogTitle className="text-center">Check your email</DialogTitle>
              <DialogDescription className="text-center">
                If {email.trim()} has an account, a reset link is on its way.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              The link is short-lived, and it has to be opened in this browser -
              part of what it needs to work stays on this device.
            </p>
            <DialogFooter>
              <Button className="w-full" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Reset your password</DialogTitle>
              <DialogDescription>
                We will email you a link to set a new one.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <Label htmlFor="reset-email">Email address</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
