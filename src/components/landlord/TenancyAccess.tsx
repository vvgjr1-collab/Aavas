import { useCallback, useEffect, useState } from 'react';
import { Users, Copy, Check, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  createInvite,
  listMembers,
  listOpenInvites,
  type DbTenancy,
  type TenancyMember,
} from '../../lib/tenancy';

const indigo = '#2e3a8c';

/**
 * Who is on this tenancy, and the code to add someone else.
 *
 * Two flatmates share one lease, so the second one joins with a code against
 * the same tenancy rather than getting a tenancy of their own. The code lives
 * here, on the property, because that is where a landlord looks when someone
 * asks how to get in.
 */
export function TenancyAccess({
  tenancy,
  userId,
}: {
  tenancy: DbTenancy | null;
  userId: string | null;
}) {
  const [members, setMembers] = useState<TenancyMember[]>([]);
  const [codes, setCodes] = useState<{ id: string; code: string; expires_at: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!tenancy) return;
    setLoading(true);
    Promise.all([listMembers(tenancy.id), listOpenInvites(tenancy.id)])
      .then(([m, c]) => {
        setMembers(m);
        setCodes(c);
      })
      .catch(() => {
        /* the panel simply stays empty */
      })
      .finally(() => setLoading(false));
  }, [tenancy?.id]);

  useEffect(load, [load]);

  if (!tenancy) return null;

  const generate = () => {
    if (!userId) return;
    setCreating(true);
    createInvite(tenancy.id, userId)
      .then(code => {
        setCodes(prev => [
          { id: code, code, expires_at: new Date(Date.now() + 12096e5).toISOString() },
          ...prev,
        ]);
        toast.success('New code created', { description: 'Share it with your tenant.' });
      })
      .catch(err => toast.error('Could not create a code', { description: err.message }))
      .finally(() => setCreating(false));
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access can be refused; the code is readable on screen.
    }
  };

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
              Share a code to add another tenant to this same lease.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
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
              <li className="text-sm text-muted-foreground">Nobody has joined yet.</li>
            )}
          </ul>
        )}

        {codes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium" style={{ color: indigo }}>
              Unused invite codes
            </p>
            {codes.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-dashed px-3 py-2"
                style={{ borderColor: 'color-mix(in srgb, #2e3a8c 35%, transparent)' }}
              >
                <span
                  className="text-lg font-semibold tracking-[0.14em] tabular-nums"
                  style={{ color: indigo }}
                >
                  {c.code}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 sm:h-8 rounded-full"
                  onClick={() => copy(c.code)}
                >
                  {copied === c.code ? (
                    <>
                      <Check className="h-4 w-4" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          disabled={creating || !userId}
          onClick={generate}
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Create a code for another tenant
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          Each code works once and expires after 14 days. Everyone who joins
          shares this lease and its rent.
        </p>
      </CardContent>
    </Card>
  );
}
