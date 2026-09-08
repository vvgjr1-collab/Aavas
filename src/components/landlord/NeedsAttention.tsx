import { motion } from 'motion/react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import type { AttentionItem, AttentionTone } from '../../lib/attention';

const TONE: Record<AttentionTone, { border: string; bg: string; fg: string; Icon: typeof AlertCircle }> = {
  urgent: {
    border: 'color-mix(in srgb, #dc2626 40%, transparent)',
    bg: 'rgba(220, 38, 38, 0.05)',
    fg: '#b91c1c',
    Icon: AlertCircle,
  },
  warn: {
    border: 'color-mix(in srgb, #d97706 40%, transparent)',
    bg: 'rgba(217, 119, 6, 0.05)',
    fg: '#b45309',
    Icon: AlertTriangle,
  },
  info: {
    border: 'var(--hairline)',
    bg: 'transparent',
    fg: 'var(--muted-foreground)',
    Icon: Info,
  },
};

/**
 * What is waiting on the landlord, above everything else.
 *
 * Nothing here can be dismissed. A dismiss button is a way for a thing that
 * still needs doing to stop being visible, which is the problem this is meant
 * to solve - a tenant's complaint or a reported payment sitting on a screen
 * nobody had opened. Each item goes when the situation behind it is resolved:
 * confirm the payment, agree the notice, close the complaint, renew the lease.
 */
export function NeedsAttention({
  items,
  onOpen,
}: {
  items: AttentionItem[];
  onOpen: (item: AttentionItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold tracking-[-0.01em]">Needs attention</h2>
        <Badge variant="secondary">{items.length}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map(item => {
          const tone = TONE[item.tone];
          const Icon = tone.Icon;
          return (
            <Card
              key={item.id}
              className="border shadow-[var(--shadow-sm)]"
              style={{ borderColor: tone.border, backgroundColor: tone.bg }}
            >
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="flex min-w-0 gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: tone.fg }} />
                  <div className="min-w-0">
                    <p className="font-medium" style={{ color: tone.fg }}>
                      {item.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 shrink-0 rounded-full sm:h-8"
                  onClick={() => onOpen(item)}
                >
                  {item.action}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        These stay until the thing behind them is done &mdash; there is no way
        to dismiss one and forget it.
      </p>
    </motion.div>
  );
}
