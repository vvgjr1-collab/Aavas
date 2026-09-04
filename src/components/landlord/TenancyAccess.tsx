import { useCallback, useEffect, useRef, useState } from 'react';
import { Users, Copy, Check, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  currentJoinCode,
  listMembers,
  rotateJoinCode,
  type DbTenancy,
  type JoinCode,
  type TenancyMember,
} from '../../lib/tenancy';

const indigo = '#2e3a8c';

/** mm:ss left, or null once it has run out. */
function useCountdown(expiresAt: string | undefined, onExpire: () => void) {
  const [left, setLeft] = useState<number | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!expiresAt) return;
    fired.current = false;
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setLeft(Math.max(0, Math.floor(ms / 1000)));
      if (ms <= 0 && !fired.current) {
        fired.current = true;
        onExpire();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, onExpire]);

  return left;
}

/**
 * Who is on this lease, and the code to add someone else.
 *
 * The code belongs to the property, not the tenancy, so it exists from the
 * moment a property is listed - a landlord with no tenant yet still has
 * something to hand out. It is valid for a window and rotates when that
 * window closes, which is what lets two flatmates use the same one while
 * stopping it becoming a permanent password to somebody's home.
 */
export function TenancyAccess({
  propertyId,
  tenancy,
}: {
  propertyId: string;
  tenancy: DbTenancy | null;
}) {
  const [members, setMembers] = useState<TenancyMember[]>([]);
  const [join, setJoin] = useState<JoinCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCode = useCallback(() => {
    currentJoinCode(propertyId)
      .then(setJoin)
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [propertyId]);

  useEffect(() => {
    setLoading(true);
    loadCode();
  }, [loadCode]);

  useEffect(() => {
    if (!tenancy) {
      setMembers([]);
      return;
    }
    let active = true;
    listMembers(tenancy.id)
      .then(m => {
        if (active) setMembers(m);
      })
      .catch(() => {
        /* the list simply stays empty */
      });
    return () => {
      active = false;
    };
  }, [tenancy?.id]);

  // When the window closes, fetch the next code rather than leaving a dead one
  // on screen for someone to read out.
  const secondsLeft = useCountdown(join?.expires_at, loadCode);

  const rotate = () => {
    setRotating(true);
    rotateJoinCode(propertyId)
      .then(next => {
        setJoin(next);
        toast.success('New code issued', { description: 'The previous one no longer works.' });
      })
      .catch(err => toast.error('Could not rotate the code', { description: err.message }))
      .finally(() => setRotating(false));
  };

  const copy = async () => {
    if (!join) return;
    try {
      await navigator.clipboard.writeText(join.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the code is readable on screen.
    }
  };

  const mmss =
    secondsLeft == null
      ? null
      : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  // A code near the end of its window is about to change under whoever is
  // reading it, so say so rather than letting them send a dud.
  const expiringSoon = secondsLeft != null && secondsLeft <= 60;

  return (
    <Card className="shadow-[var(--shadow-md)] border border-[#2e3a8c]/25">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
            style={{ backgroundColor: indigo }}
          >
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg" style={{ color: indigo }}>
              Who lives here
            </CardTitle>
            <CardDescription>
              Share the code below to add a tenant to this lease.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <ul className="space-y-2">
          {members.map(m => (
            <li
              key={m.tenant_id}
              className="flex items-center justify-between rounded-xl border border-[var(--hairline)] px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{m.full_name}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
              <span className="text-xs text-muted-foreground">
                since{' '}
                {new Date(m.joined_at).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </li>
          ))}
          {members.length === 0 && (
            <li className="text-sm text-muted-foreground">
              Nobody has joined yet. Share the code to get started.
            </li>
          )}
        </ul>

        <div
          className="rounded-2xl border border-dashed p-5 text-center"
          style={{ borderColor: `color-mix(in srgb, ${indigo} 35%, transparent)` }}
        >
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading the current code…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <>
              <p
                className="text-3xl font-semibold tracking-[0.18em] tabular-nums"
                style={{ color: indigo }}
              >
                {join?.code ?? '--------'}
              </p>
              <p
                className={`mt-2 text-sm tabular-nums ${
                  expiringSoon ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {mmss ? `Changes in ${mmss}` : 'Rotating…'}
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" className="h-11 sm:h-8 rounded-full" onClick={copy}>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 sm:h-8 rounded-full"
                  disabled={rotating}
                  onClick={rotate}
                >
                  {rotating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" /> New code
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          The code changes every 15 minutes. Anyone who uses it while it is
          valid joins this same lease, so flatmates can each join with the same
          code &mdash; and a code that leaks stops working shortly after.
        </p>
      </CardContent>
    </Card>
  );
}
