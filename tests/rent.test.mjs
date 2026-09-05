/**
 * The rent period logic, at dates that are not today.
 *
 * Driving the app only ever exercises the current month, which is exactly the
 * case least likely to be wrong. These pin the edges: the turn of a year, a
 * payment made before the month it covers, the grace period, and a month with
 * nothing in it at all.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// rent.ts is plain logic behind its type annotations. esbuild is already here
// as one of vite's dependencies, so stripping the types costs nothing and the
// test runs the real module rather than a copy that can drift from it.
import { transformSync } from 'esbuild';

const { code: src } = transformSync(
  readFileSync(new URL('../src/lib/rent.ts', import.meta.url), 'utf8'),
  { loader: 'ts', format: 'esm' },
);

const dir = mkdtempSync(join(tmpdir(), 'rent-'));
const file = join(dir, 'rent.mjs');
writeFileSync(file, src);
const rent = await import(pathToFileURL(file).href);

let pass = 0;
let fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass++;
    console.log('  PASS  ' + label);
  } else {
    fail++;
    console.log(
      '  FAIL  ' + label +
      '\n        expected ' + JSON.stringify(expected) +
      ', got ' + JSON.stringify(actual),
    );
  }
};

const payment = (over = {}) => ({
  id: over.id ?? 'p1',
  tenancy_id: 't1',
  amount: over.amount ?? 25000,
  due_date: over.due_date ?? null,
  paid_at: over.paid_at ?? null,
  method: 'UPI',
  reference: '',
  status: over.status ?? 'reported',
  recorded_by: 'u1',
  created_at: over.created_at ?? '2026-09-06T10:00:00.000Z',
});

console.log('months:');
check('a key names the month it is for', rent.monthKey(new Date(2026, 8, 6)), '2026-09');
check('shifting crosses a year end', rent.shiftMonth('2026-12', 1), '2027-01');
check('and goes backwards', rent.shiftMonth('2027-01', -1), '2026-12');
check('the label reads as a person would say it', rent.monthLabel('2026-09'), 'September 2026');

console.log('\nwhich month a payment covers:');
check(
  'the recorded due date wins',
  rent.periodOf(payment({ due_date: '2026-10-01', paid_at: '2026-09-28T00:00:00Z' })),
  '2026-10',
);
check(
  'an older row with no due date falls back to when it was paid',
  rent.periodOf(payment({ due_date: null, paid_at: '2026-09-06T10:00:00Z' })),
  '2026-09',
);

console.log('\nthe current month:');
const now = new Date(2026, 8, 6, 12); // 6 September 2026

const paidThisMonth = rent.currentRent({
  start: '2026-09-06',
  rent: 25000,
  payments: [payment({ due_date: '2026-09-01', paid_at: '2026-09-06T10:00:00Z' })],
  now,
});
check('paying in September settles September', paidThisMonth.period.key, '2026-09');
check('and it does not say December', paidThisMonth.period.label, 'September 2026');
check('the tenant is shown as settled', paidThisMonth.settled, true);
check('the next thing owed is October', paidThisMonth.nextDue.key, '2026-10');
check('with a plain date a timezone cannot move', paidThisMonth.nextDue.dueOn, '2026-10-01');
check('which is not due yet', paidThisMonth.nextDue.status, 'upcoming');

const unpaid = rent.currentRent({ start: '2026-09-06', rent: 25000, payments: [], now });
check('with no payment the month is not settled', unpaid.settled, false);
check('and what is owed is this month, not next', unpaid.nextDue.key, '2026-09');
// The grace runs through the 5th; the 6th is the first late day.
const onGrace = d =>
  rent.currentRent({ start: '2026-09-01', rent: 25000, payments: [], now: d }).period.status;
check('the 1st is due, not late', onGrace(new Date(2026, 8, 1, 9)), 'due');
check('the last day of grace is still due', onGrace(new Date(2026, 8, 5, 23)), 'due');
check('the day after it is late', onGrace(new Date(2026, 8, 6, 1)), 'late');
check('and two weeks in, still late', onGrace(new Date(2026, 8, 20, 12)), 'late');

console.log('\nhistory:');
const history = rent.rentHistory({
  start: '2026-07-15',
  rent: 25000,
  payments: [
    payment({ id: 'a', due_date: '2026-07-01', status: 'paid', paid_at: '2026-07-02T00:00:00Z' }),
    payment({ id: 'b', due_date: '2026-09-01', status: 'reported', paid_at: '2026-09-06T00:00:00Z' }),
  ],
  now,
});
check('every month since the lease began is listed', history.map(p => p.key), ['2026-09', '2026-08', '2026-07']);
check('newest first', history[0].key, '2026-09');
check('a month nobody paid still appears', history[1].status, 'late');
check('a confirmed payment reads as paid', history[2].status, 'paid');
check('a reported one is not claimed as paid', history[0].status, 'reported');
check('the amount comes from the payment, not the lease', history[2].amount, 25000);

const confirmedWins = rent.rentHistory({
  start: '2026-09-01',
  rent: 25000,
  payments: [
    payment({ id: 'x', due_date: '2026-09-01', status: 'reported' }),
    payment({ id: 'y', due_date: '2026-09-01', status: 'paid' }),
  ],
  now,
});
check('a confirmed payment outranks a reported one for the same month', confirmedWins[0].payment.id, 'y');

const noLease = rent.rentHistory({ start: null, rent: 25000, payments: [], now });
check('with no lease date it still answers for this month', noLease.map(p => p.key), ['2026-09']);

const longLease = rent.rentHistory({
  start: '2024-01-01',
  rent: 25000,
  payments: [],
  now,
  limit: 12,
});
check('a long lease is capped', longLease.length, 12);
check('and the cap keeps the newest months', longLease[0].key, '2026-09');

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail === 0 ? 0 : 1);
