import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Loader2, MailWarning } from 'lucide-react';

import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { supabase } from '../../lib/supabase';

/**
 * Where a confirmation link lands.
 *
 * It used to land on the marketing homepage, which invited someone who had
 * just confirmed their account to "Get started" - the session was already
 * there, the page simply had no idea. This waits for the code in the URL to
 * become a session and then carries on into the app.
 *
 * The wait is the point: the exchange is a network round trip, so deciding
 * anything on first render would decide it wrongly.
 */
export function EmailConfirmed({
  onContinue,
  onSignIn,
}: {
  /** Called once the session exists. */
  onContinue: () => void;
  onSignIn: () => void;
}) {
  const [state, setState] = useState<'checking' | 'failed'>('checking');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!supabase) {
      setState('failed');
      setReason('This build has no backend configured.');
      return;
    }

    // A refused link comes back as query parameters rather than an error, so
    // read those before waiting for a session that is never coming.
    const params = new URLSearchParams(window.location.search);
    const described = params.get('error_description') ?? params.get('error');
    if (described) {
      setState('failed');
      setReason(described.replace(/\+/g, ' '));
      return;
    }

    let settled = false;
    const succeed = () => {
      if (settled) return;
      settled = true;
      onContinue();
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) succeed();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) succeed();
    });

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      setState('failed');
      setReason(
        'Your email may be confirmed already. Signing in will tell us for certain.',
      );
    }, 6000);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [onContinue]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-md"
    >
      <Card className="shadow-[var(--shadow-lg)]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
            {state === 'checking' ? (
              <Check className="h-7 w-7 text-primary" />
            ) : (
              <MailWarning className="h-7 w-7 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {state === 'checking' ? 'Email confirmed' : 'Almost there'}
          </CardTitle>
          <CardDescription>
            {state === 'checking'
              ? 'Signing you in…'
              : 'We could not sign you in from that link.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {state === 'checking' ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Alert>
                <AlertDescription>{reason}</AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                A confirmation link only signs you in on the device that asked
                for it, and only once. Opening it a second time, or on another
                phone, leaves you to sign in normally.
              </p>
              <Button className="w-full" onClick={onSignIn}>
                Go to sign in
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
