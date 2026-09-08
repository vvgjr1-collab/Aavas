/**
 * What reaches the landlord's attention strip, and what deliberately does not.
 *
 * The rules are about judgement rather than arithmetic - a lease ending in a
 * month matters, a vacant property is not a task - so they are worth pinning
 * where a browser run would only ever exercise one portfolio's state.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { transformSync } from 'esbuild';

const { code } = transformSync(
  readFileSync(new URL('../src/lib/attention.ts', import.meta.url), 'utf8'),
  { loader: 'ts', format: 'esm' },
);
const dir = mkdtempSync(join(tmpdir(), 'attention-'));
const file = join(dir, 'attention.mjs');
writeFileSync(file, code);
const lib = await import(pathToFileURL(file).href);

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

const now = new Date(2026, 8, 8, 12); // 8 September 2026
const property = { id: 'p1', title: 'Sunview 2BHK' };
const tenancy = (over = {}) => ({
  id: over.id ?? 't1',
  property_id: 'p1',
  landlord_id: 'me',
  tenant_id: 'them',
  status: over.status ?? 'active',
  end_requested_at: over.end_requested_at ?? null,
  end_date: over.end_date ?? null,
});
const payment = (over = {}) => ({
  id: over.id ?? 'pay1',
  tenancy_id: 't1',
  amount: over.amount ?? 25000,
  status: over.status ?? 'reported',
});
const complaint = (over = {}) => ({
  id: over.id ?? 'c1',
  tenancy_id: 't1',
  title: over.title ?? 'Leaking tap',
  category: 'plumbing',
  status: over.status ?? 'open',
  priority: over.priority ?? 'medium',
});

const base = { properties: [property], tenancies: [], pendingClaims: [], payments: [], complaints: [], now };
const ids = items => items.map(i => i.id);

console.log('a quiet portfolio:');
check('shows nothing at all', lib.attentionFor(base), []);
check('and an active tenancy alone is not a task',
  lib.attentionFor({ ...base, tenancies: [tenancy()] }), []);

console.log('\nthings waiting on the landlord:');
check('a tenant waiting to be connected',
  ids(lib.attentionFor({ ...base, pendingClaims: [{ id: 'x', claimed_address: '9 Carter Road' }] })),
  ['claim-x']);
check('notice given on a tenancy',
  ids(lib.attentionFor({ ...base, tenancies: [tenancy({ end_requested_at: '2026-09-05' })] })),
  ['notice-t1']);
check('rent reported but not confirmed',
  ids(lib.attentionFor({ ...base, tenancies: [tenancy()], payments: [payment()] })),
  ['payments-reported']);
check('an open complaint',
  ids(lib.attentionFor({ ...base, tenancies: [tenancy()], complaints: [complaint()] })),
  ['complaints-open']);

console.log('\nthings that are not tasks:');
check('a confirmed payment is done with',
  lib.attentionFor({ ...base, tenancies: [tenancy()], payments: [payment({ status: 'paid' })] }), []);
check('a resolved complaint is done with',
  lib.attentionFor({ ...base, tenancies: [tenancy()], complaints: [complaint({ status: 'resolved' })] }), []);
check('an ended tenancy raises nothing',
  lib.attentionFor({ ...base, tenancies: [tenancy({ status: 'ended', end_requested_at: '2026-09-01' })] }), []);

console.log('\nleases:');
check('one ending in three weeks is worth knowing',
  ids(lib.attentionFor({ ...base, tenancies: [tenancy({ end_date: '2026-09-29' })] })),
  ['lease-ending-t1']);
check('one ending in six months is not',
  lib.attentionFor({ ...base, tenancies: [tenancy({ end_date: '2027-03-01' })] }), []);
const expired = lib.attentionFor({ ...base, tenancies: [tenancy({ end_date: '2026-08-30' })] });
check('one that has run out is', ids(expired), ['lease-ended-t1']);
check('and says how long ago', /9 days ago/.test(expired[0].detail), true);

console.log('\nurgency:');
const mixed = lib.attentionFor({
  ...base,
  tenancies: [tenancy({ end_date: '2026-09-20' })],
  payments: [payment()],
  pendingClaims: [{ id: 'x', claimed_address: 'somewhere' }],
});
check('the urgent one comes first', mixed[0].id, 'claim-x');
check('then what is merely waiting', mixed[1].id, 'payments-reported');
check('then what is only worth knowing', mixed[2].id, 'lease-ending-t1');

const urgentComplaint = lib.attentionFor({
  ...base,
  tenancies: [tenancy()],
  complaints: [complaint({ priority: 'urgent' })],
});
check('an urgent complaint outranks a routine one', urgentComplaint[0].tone, 'urgent');
check('a routine one is a warning',
  lib.attentionFor({ ...base, tenancies: [tenancy()], complaints: [complaint()] })[0].tone, 'warn');

console.log('\ncounting:');
const many = lib.attentionFor({
  ...base,
  tenancies: [tenancy()],
  complaints: [complaint({ id: 'c1' }), complaint({ id: 'c2' }), complaint({ id: 'c3' })],
  payments: [payment({ id: 'a' }), payment({ id: 'b' })],
});
check('complaints are summarised, not listed one by one',
  many.filter(i => i.id === 'complaints-open').length, 1);
check('and the count is in the title', /3 complaints/.test(many.find(i => i.id === 'complaints-open').title), true);
check('payments too', /2 rent payments/.test(many.find(i => i.id === 'payments-reported').title), true);
check('with the total owed', /50,000/.test(many.find(i => i.id === 'payments-reported').detail), true);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail === 0 ? 0 : 1);
