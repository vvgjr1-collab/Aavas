import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Eye, EyeOff, Loader2, Lock } from 'lucide-react';

import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { updatePassword } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

const MIN_LENGTH = 8;

/**
 * The other end of a recovery email.
 *
 * The link comes back with ?code=... in the query string, which the client
 * exchanges for a short-lived session on load - that session is the only thing
 * authorising the password change, so this screen has to wait for it before
 * offering the form. Offering the form first would mean typing a new password
 * and being told afterwards that the link was no good.
 */
export function ResetPassword({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<'checking' | 'ready' | 'invalid' | 'done'>('checking');
  const [linkError, setLinkError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) {
      setState('invalid');
      setLinkError('This build has no backend configured.');
      return;
    }

    // Supabase reports a refused link in the query string rather than by
    // throwing, so read that before waiting for a session that will not come.
    const params = new URLSearchParams(window.location.search);
    const described = params.get('error_description') ?? params.get('error');
    if (described) {
      setState('invalid');
      setLinkError(described.replace(/\+/g, ' '));
      return;
    }

    let settled = false;
    const succeed = () => {
      if (settled) return;
      settled = true;
      setState('ready');
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) succeed();
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) succeed();
    });

    // The exchange is a network round trip; give it a moment before deciding
    // the link is bad.
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        setState('invalid');
        setLinkError('This link has expired, or it was opened in a different browser.');
      }
    }, 6000);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Those two passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await updatePassword(password);
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-md"
    >
      <Card className="shadow-[var(--shadow-lg)]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
            {state === 'done' ? (
              <Check className="h-7 w-7 text-primary" />
            ) : (
              <Lock className="h-7 w-7 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {state === 'done' ? 'Password changed' : 'Choose a new password'}
          </CardTitle>
          <CardDescription>
            {state === 'checking' && 'Checking your link…'}
            {state === 'ready' && 'You are signed in from the link. Set a new password to finish.'}
            {state === 'invalid' && 'This link cannot be used.'}
            {state === 'done' && 'You are signed in with your new password.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {state === 'checking' && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {state === 'invalid' && (
            <>
              <Alert variant="destructive">
                <AlertDescription>{linkError}</AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                Reset links are short-lived, and they only work in the browser
                that asked for them. Request a new one from the sign-in screen.
              </p>
              <Button className="w-full" onClick={onDone}>
                Back to sign in
              </Button>
            </>
          )}

          {state === 'ready' && (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    aria-label={show ? 'Hide password' : 'Show password'}
                    onClick={() => setShow(v => !v)}
                    className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  At least {MIN_LENGTH} characters.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Change password'}
              </Button>
            </form>
          )}

          {state === 'done' && (
            <Button className="w-full" onClick={onDone}>
              Continue
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
