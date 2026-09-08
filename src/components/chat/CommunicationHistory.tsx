import { useCallback, useEffect, useState } from 'react';
import { Loader2, Lock, MessageSquare, PhoneCall } from 'lucide-react';

import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { listHistory, type DbMessage } from '../../lib/messages';

const stamp = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const dayOf = (iso: string) => new Date(iso).toDateString();

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Everything said and every call placed, in one list.
 *
 * The point of this screen is that it is a record, so it does exactly one
 * thing: show what happened, in order, with no way to change or remove any of
 * it. That is not a policy decision made here - the database refuses the edit
 * and the delete - which is what makes it worth pointing at during a
 * disagreement.
 *
 * A call entry says a call was placed and by whom. It does not say it
 * connected, was answered, or how long it lasted, because the app hands a
 * number to the phone and hears nothing back. The screen this replaces showed
 * all three, invented.
 */
export function CommunicationHistory({
  tenancyId,
  viewerId,
  counterparty,
  emptyHint,
}: {
  tenancyId: string | null;
  viewerId: string | null;
  counterparty: string;
  emptyHint?: string;
}) {
  const [entries, setEntries] = useState<DbMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!tenancyId) {
      setEntries([]);
      return;
    }
    setLoading(true);
    listHistory(tenancyId)
      .then(setEntries)
      .catch(() => {
        /* an empty list reads as "nothing yet" rather than breaking the page */
      })
      .finally(() => setLoading(false));
  }, [tenancyId]);

  useEffect(load, [load]);

  const calls = entries.filter(e => e.kind === 'call').length;
  const texts = entries.length - calls;

  // Newest first: a record is usually opened to see what happened last.
  const ordered = [...entries].reverse();
  let lastDay = '';

  return (
    <Card className="shadow-[var(--shadow-md)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Communication record</CardTitle>
        <CardDescription>
          {entries.length === 0
            ? 'Every message and call between the two of you appears here.'
            : `${texts} message${texts === 1 ? '' : 's'} and ${calls} call${calls === 1 ? '' : 's'} between you and ${counterparty}.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="flex items-start gap-2 rounded-xl border border-[var(--hairline)] p-3 text-xs text-muted-foreground">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Nothing here can be edited or deleted, by either of you or by Aavas.
            A call entry records that a call was placed from the app &mdash; not
            whether it was answered, or how long it lasted, which the app has no
            way to know.
          </span>
        </p>

        {loading && entries.length === 0 && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && entries.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {emptyHint ?? 'Nothing yet.'}
          </p>
        )}

        <ol className="space-y-3">
          {ordered.map(entry => {
            const mine = entry.sender_id === viewerId;
            const who = mine ? 'You' : counterparty;
            const showDay = dayOf(entry.created_at) !== lastDay;
            lastDay = dayOf(entry.created_at);
            return (
              <li key={entry.id}>
                {showDay && (
                  <p className="pb-2 pt-1 text-xs font-medium text-muted-foreground">
                    {dayLabel(entry.created_at)}
                  </p>
                )}
                <div className="flex gap-3 rounded-xl border border-[var(--hairline)] p-3">
                  <div
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                      entry.kind === 'call' ? 'bg-green-500/15' : 'bg-primary/10'
                    }`}
                  >
                    {entry.kind === 'call' ? (
                      <PhoneCall className="h-4 w-4 text-green-700 dark:text-green-400" />
                    ) : (
                      <MessageSquare className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{who}</span>
                      <Badge variant="secondary" className="text-xs">
                        {entry.kind === 'call' ? 'Call placed' : 'Message'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {stamp(entry.created_at)}
                      </span>
                    </div>
                    {entry.kind === 'text' ? (
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                        {entry.body}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {mine
                          ? `You called ${counterparty} from Aavas.`
                          : `${counterparty} called you from Aavas.`}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
