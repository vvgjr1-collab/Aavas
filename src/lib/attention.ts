import type { DbComplaint, DbPayment } from './records';
import type { DbTenancy } from './tenancy';
import type { Property } from '../types/property';

/**
 * What a landlord has to do something about, derived from the data.
 *
 * Deliberately not dismissible. A banner with an X is a way for a thing that
 * still needs doing to stop being visible, and the whole reason this exists is
 * that a tenant's message, a reported payment or a notice was sitting
 * somewhere nobody had opened. An item here disappears when the underlying
 * situation is actually resolved - the payment is confirmed, the complaint is
 * closed, the notice is agreed - and not before.
 *
 * Only things with a next action appear. A property being vacant is a fact,
 * not a task; putting it here permanently would train someone to ignore the
 * whole strip.
 */

export type AttentionTone = 'urgent' | 'warn' | 'info';

export interface AttentionItem {
  id: string;
  tone: AttentionTone;
  title: string;
  detail: string;
  /** What pressing it does about the thing. */
  action: string;
  /** Route to go to, when the action is somewhere else. */
  href?: string;
  propertyId?: string;
}

export interface AttentionInputs {
  properties: Property[];
  /** Tenancies where this account is the landlord. */
  tenancies: DbTenancy[];
  pendingClaims: DbTenancy[];
  /** Payments across those tenancies. */
  payments: DbPayment[];
  complaints: DbComplaint[];
  now?: Date;
}

/** A lease is worth flagging this far ahead of its end date. */
const ENDING_SOON_DAYS = 30;

const daysBetween = (a: Date, b: Date) =>
  Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

export function attentionFor(input: AttentionInputs): AttentionItem[] {
  const now = input.now ?? new Date();
  const items: AttentionItem[] = [];
  const titleFor = (propertyId: string | null) =>
    input.properties.find(p => p.id === propertyId)?.title ?? 'a property';

  for (const claim of input.pendingClaims) {
    items.push({
      id: `claim-${claim.id}`,
      tone: 'urgent',
      title: 'A tenant is waiting to be connected',
      detail: claim.claimed_address ?? 'They set their tenancy up before you joined.',
      action: 'Review',
    });
  }

  for (const t of input.tenancies) {
    if (t.status === 'active' && t.end_requested_at) {
      items.push({
        id: `notice-${t.id}`,
        tone: 'urgent',
        title: 'Notice has been given',
        detail: `${titleFor(t.property_id)} — the tenancy runs until you both agree.`,
        action: 'Review',
        propertyId: t.property_id ?? undefined,
      });
    }
  }

  const reported = input.payments.filter(p => p.status === 'reported');
  if (reported.length > 0) {
    const total = reported.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    items.push({
      id: 'payments-reported',
      tone: 'warn',
      title:
        reported.length === 1
          ? 'A rent payment is waiting to be confirmed'
          : `${reported.length} rent payments are waiting to be confirmed`,
      detail: `₹${total.toLocaleString('en-IN')} reported by your tenant.`,
      action: 'Confirm',
    });
  }

  const open = input.complaints.filter(c => c.status === 'open');
  if (open.length > 0) {
    const urgent = open.filter(c => c.priority === 'urgent' || c.priority === 'high');
    items.push({
      id: 'complaints-open',
      tone: urgent.length > 0 ? 'urgent' : 'warn',
      title:
        open.length === 1
          ? 'A complaint has not been looked at'
          : `${open.length} complaints have not been looked at`,
      detail:
        urgent.length > 0
          ? `${urgent.length} of them marked high or urgent.`
          : open.map(c => c.title || c.category).slice(0, 2).join(', '),
      action: 'Open',
      propertyId:
        input.tenancies.find(t => t.id === open[0].tenancy_id)?.property_id ?? undefined,
    });
  }

  for (const t of input.tenancies) {
    if (t.status !== 'active' || !t.end_date) continue;
    const days = daysBetween(new Date(t.end_date), now);
    if (days < 0) {
      items.push({
        id: `lease-ended-${t.id}`,
        tone: 'warn',
        title: 'A lease has run out',
        detail: `${titleFor(t.property_id)} — it ended ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago and nobody has renewed it.`,
        action: 'Manage',
        propertyId: t.property_id ?? undefined,
      });
    } else if (days <= ENDING_SOON_DAYS) {
      items.push({
        id: `lease-ending-${t.id}`,
        tone: 'info',
        title: 'A lease ends soon',
        detail: `${titleFor(t.property_id)} — ${days} day${days === 1 ? '' : 's'} left.`,
        action: 'Manage',
        propertyId: t.property_id ?? undefined,
      });
    }
  }

  // Urgent first, so the strip reads top-down in the order things matter.
  const rank: Record<AttentionTone, number> = { urgent: 0, warn: 1, info: 2 };
  return items.sort((a, b) => rank[a.tone] - rank[b.tone]);
}
