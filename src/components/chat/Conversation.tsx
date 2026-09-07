import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  MAX_MESSAGE_LENGTH,
  listMessages,
  markRead,
  sendMessage,
  type DbMessage,
} from '../../lib/messages';

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const day = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * The conversation on a tenancy, for whichever side is looking at it.
 *
 * Both dashboards used to render a fixed exchange about a plumber, and typing
 * into the box appended to local state - so each side could hold a whole
 * conversation with themselves and believe it had been sent. One component now
 * serves both, because the thread is one thread.
 *
 * It polls rather than subscribing. A tenancy conversation is two or three
 * people exchanging a handful of messages, and a five second poll needs no
 * publication configured in the dashboard to go wrong quietly.
 */
export function Conversation({
  tenancyId,
  viewerId,
  counterparty,
  disabled,
  emptyHint,
}: {
  tenancyId: string | null;
  viewerId: string | null;
  /** How to label the other side's messages. */
  counterparty: string;
  /** Set when there is nobody to talk to yet. */
  disabled?: string;
  emptyHint?: string;
}) {
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const seenCount = useRef(0);

  const load = useCallback(
    async (quiet = false) => {
      if (!tenancyId) return;
      if (!quiet) setLoading(true);
      try {
        const rows = await listMessages(tenancyId);
        setMessages(rows);
        if (viewerId && rows.some(m => m.sender_id !== viewerId && !m.read_at)) {
          await markRead(tenancyId, viewerId);
        }
      } catch {
        /* leave what is on screen rather than emptying it mid-conversation */
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [tenancyId, viewerId],
  );

  useEffect(() => {
    load();
    if (!tenancyId) return;
    const id = window.setInterval(() => load(true), 5000);
    return () => window.clearInterval(id);
  }, [load, tenancyId]);

  // Only follow the thread when something new arrives, so reading back through
  // it is not yanked to the bottom every five seconds.
  useEffect(() => {
    if (messages.length !== seenCount.current) {
      seenCount.current = messages.length;
      endRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [messages]);

  const send = async () => {
    if (!tenancyId || !viewerId) return;
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const sent = await sendMessage({ tenancyId, senderId: viewerId, body });
      setMessages(prev => [...prev, sent]);
      setDraft('');
    } catch (err) {
      toast.error('Could not send that', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSending(false);
    }
  };

  if (disabled) {
    return (
      <div className="grid min-h-40 place-items-center rounded-2xl border border-[var(--hairline)] p-6 text-center">
        <p className="text-sm text-muted-foreground">{disabled}</p>
      </div>
    );
  }

  let lastDay = '';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-40 flex-1 space-y-3 overflow-y-auto p-1">
        {loading && messages.length === 0 && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {emptyHint ?? 'No messages yet. Say hello.'}
          </p>
        )}

        {messages.map(m => {
          const mine = m.sender_id === viewerId;
          const stamp = day(m.created_at);
          const showDay = stamp !== lastDay;
          lastDay = stamp;
          return (
            <div key={m.id}>
              {showDay && (
                <p className="py-2 text-center text-xs text-muted-foreground">{stamp}</p>
              )}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    mine
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                  <p
                    className={`mt-1 text-[11px] ${
                      mine ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {mine ? 'You' : counterparty} · {time(m.created_at)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-end gap-2 border-t border-[var(--hairline)] pt-3">
        <Textarea
          value={draft}
          onChange={e => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          onKeyDown={e => {
            // Enter sends; Shift+Enter is a new line, as everywhere else.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={`Message ${counterparty}…`}
          rows={2}
          className="min-h-11 resize-none"
          aria-label="Message"
        />
        <Button
          onClick={send}
          disabled={sending || !draft.trim()}
          className="h-11 shrink-0 rounded-full"
          aria-label="Send message"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
