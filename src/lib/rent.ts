import type { DbPayment } from './records';

/**
 * Which month's rent is settled, and which is not.
 *
 * Both dashboards used to answer this from hardcoded arrays - the landlord saw
 * five invented months, the tenant saw "Rent Paid for December" whatever the
 * date - so the two sides of the same tenancy could not disagree, because
 * neither was reading anything. Everything here derives from the payments
 * table so they are answering from the same rows.
 *
 * The convention, unchanged from the screen it replaces: rent for a month is
 * due on the 1st of that month.
 */

export type RentStatus = 'paid' | 'reported' | 'due' | 'late' | 'upcoming';

export interface RentPeriod {
  /** 'YYYY-MM' - the month the rent is *for*, not when it was handed over. */
  key: string;
  label: string;
  amount: number;
  /** 'YYYY-MM-DD' - the 1st of the month. A plain date, deliberately: a
   *  timestamp would shift across the month boundary in some timezones. */
  dueOn: string;
  status: RentStatus;
  /** When the tenant says they paid, if they have. */
  paidAt: string | null;
  payment: DbPayment | null;
}

/**
 * The grace runs through this day of the month: rent due on the 1st reads as
 * "due" up to and including the 5th, and "late" from the 6th.
 */
const GRACE_DAYS = 5;

const pad = (n: number) => String(n).padStart(2, '0');

export const monthKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const keyToDate = (key: string): Date => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1);
};

export const monthLabel = (key: string): string =>
  keyToDate(key).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

/** The 1st of the given month, as a local date at midnight. */
export const dueDateOf = (key: string): Date => keyToDate(key);

/** 'YYYY-MM-01' for the month - what goes in payments.due_date. */
export const dueDateStringOf = (key: string): string => `${key}-01`;

/** Render a 'YYYY-MM-DD' due date without letting a timezone move it a day. */
export const formatDue = (dueOn: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string => {
  const [y, m, d] = dueOn.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', opts);
};

/**
 * The month a payment is for.
 *
 * Prefers the due date recorded with it. Older rows were written with none, so
 * they fall back to the month they were made in - which is right for rent paid
 * during its own month, and the best available guess otherwise.
 */
export function periodOf(payment: DbPayment): string {
  // A date column arrives as 'YYYY-MM-DD' and already names its month. Parsing
  // it as a timestamp would read it as UTC midnight, which is the last day of
  // the previous month anywhere west of Greenwich.
  if (payment.due_date && /^\d{4}-\d{2}-\d{2}$/.test(payment.due_date)) {
    return payment.due_date.slice(0, 7);
  }
  const stamp = payment.due_date ?? payment.paid_at ?? payment.created_at;
  return monthKey(new Date(stamp));
}

/** Shifts a 'YYYY-MM' key by whole months. */
export function shiftMonth(key: string, months: number): string {
  const d = keyToDate(key);
  d.setMonth(d.getMonth() + months);
  return monthKey(d);
}

function statusFor(payment: DbPayment | null, key: string, now: Date): RentStatus {
  if (payment) return payment.status === 'paid' ? 'paid' : 'reported';
  const due = dueDateOf(key);
  if (due > now) return 'upcoming';
  const late = new Date(due);
  late.setDate(late.getDate() + GRACE_DAYS);
  return now > late ? 'late' : 'due';
}

/**
 * The strongest claim on a month: a landlord-confirmed payment outranks a
 * tenant-reported one, so a month is not shown as merely "reported" when the
 * money has already been acknowledged.
 */
function best(payments: DbPayment[]): DbPayment | null {
  if (payments.length === 0) return null;
  return (
    payments.find(p => p.status === 'paid') ??
    payments.find(p => p.status === 'reported') ??
    payments[0]
  );
}

export interface RentHistoryInput {
  /** Lease start, ISO. History begins at the month it falls in. */
  start?: string | null;
  rent: number;
  payments: DbPayment[];
  now?: Date;
  /** Months to show at most, newest first. */
  limit?: number;
}

/**
 * Every month from the start of the lease to now, newest first, each carrying
 * whatever payment covers it.
 *
 * Months with no payment are included on purpose: a rent history that only
 * lists money received cannot show the month that is missing, which is the one
 * thing a landlord opens this screen to find out.
 */
export function rentHistory({
  start,
  rent,
  payments,
  now = new Date(),
  limit = 12,
}: RentHistoryInput): RentPeriod[] {
  const byPeriod = new Map<string, DbPayment[]>();
  for (const p of payments) {
    const key = periodOf(p);
    const bucket = byPeriod.get(key);
    if (bucket) bucket.push(p);
    else byPeriod.set(key, [p]);
  }

  const current = monthKey(now);
  // Start at the lease, but never after a month somebody has already paid for,
  // and never after the current month.
  const candidates = [current, ...byPeriod.keys()];
  if (start) {
    const d = new Date(start);
    if (!Number.isNaN(d.getTime())) candidates.push(monthKey(d));
  }
  const first = candidates.reduce((a, b) => (a < b ? a : b));

  // A payment dated into the future should still be shown.
  const last = [current, ...byPeriod.keys()].reduce((a, b) => (a > b ? a : b));

  const keys: string[] = [];
  for (let k = first; k <= last; k = shiftMonth(k, 1)) keys.push(k);

  return keys
    .reverse()
    .slice(0, limit)
    .map(key => {
      const payment = best(byPeriod.get(key) ?? []);
      return {
        key,
        label: monthLabel(key),
        amount: payment ? Number(payment.amount) : rent,
        dueOn: dueDateStringOf(key),
        status: statusFor(payment, key, now),
        paidAt: payment?.paid_at ?? null,
        payment,
      };
    });
}

/**
 * Where the tenant stands right now: this month, and the next thing they owe.
 *
 * `settled` is what the dashboard badge reads. It covers a payment the tenant
 * has reported but the landlord has not confirmed - from the tenant's side the
 * money has gone, and telling them they still owe it would be wrong.
 */
export function currentRent(input: RentHistoryInput): {
  period: RentPeriod;
  settled: boolean;
  nextDue: RentPeriod;
} {
  const now = input.now ?? new Date();
  const history = rentHistory({ ...input, now, limit: 24 });
  const key = monthKey(now);
  const period =
    history.find(p => p.key === key) ??
    {
      key,
      label: monthLabel(key),
      amount: input.rent,
      dueOn: dueDateStringOf(key),
      status: 'due' as RentStatus,
      paidAt: null,
      payment: null,
    };

  const settled = period.status === 'paid' || period.status === 'reported';
  const nextKey = settled ? shiftMonth(key, 1) : key;
  const nextDue =
    history.find(p => p.key === nextKey) ??
    {
      key: nextKey,
      label: monthLabel(nextKey),
      amount: input.rent,
      dueOn: dueDateStringOf(nextKey),
      status: statusFor(null, nextKey, now),
      paidAt: null,
      payment: null,
    };

  return { period, settled, nextDue };
}
