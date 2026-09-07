/**
 * What "complete" means, and for whom.
 *
 * The percentage drives a badge people act on, so the arithmetic and the
 * branching by role are worth pinning where a browser drive would only ever
 * exercise one account's state.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { transformSync } from 'esbuild';

const { code } = transformSync(
  readFileSync(new URL('../src/lib/profileCompletion.ts', import.meta.url), 'utf8'),
  { loader: 'ts', format: 'esm' },
);
const dir = mkdtempSync(join(tmpdir(), 'completion-'));
const file = join(dir, 'completion.mjs');
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

const profile = (over = {}) => ({
  id: 'u1',
  full_name: over.full_name ?? '',
  email: 'someone@example.com',
  phone: over.phone ?? null,
  active_role: over.active_role ?? null,
  onboarding: {},
});

console.log('phone numbers:');
check('a plain ten digit number is fine', lib.looksLikePhone('9876543210'), true);
check('so is one with a country code and spaces', lib.looksLikePhone('+91 98765 43210'), true);
check('punctuation does not matter', lib.looksLikePhone('(022) 2222-3333'), true);
check('too short is refused', lib.looksLikePhone('12345'), false);
check('so is a wall of digits', lib.looksLikePhone('1234567890123456789'), false);
check('empty is refused, not treated as given', lib.looksLikePhone(''), false);
check('and so is null', lib.looksLikePhone(null), false);
check('letters alone do not count', lib.looksLikePhone('call me'), false);

console.log('\na brand new account:');
const fresh = lib.completionFor({ profile: profile(), role: null });
check('is not complete', fresh.percent < 100, true);
check('and the first thing asked for is the name', fresh.next.id, 'name');
check('with no role chosen there are three steps', fresh.total, 3);

console.log('\na landlord:');
const landlordEmpty = lib.completionFor({
  profile: profile({ full_name: 'Asha' }),
  role: 'landlord',
  propertyCount: 0,
});
check('is asked for a property', landlordEmpty.steps.some(s => s.id === 'property'), true);
check('and not for a rent agreement', landlordEmpty.steps.some(s => s.id === 'agreement'), false);
check('name done, phone and property missing, role done', landlordEmpty.done, 2);
check('out of four', landlordEmpty.total, 4);
check('which is half', landlordEmpty.percent, 50);
check('and the next thing is the phone number', landlordEmpty.next.id, 'phone');

const landlordDone = lib.completionFor({
  profile: profile({ full_name: 'Asha', phone: '+91 98765 43210' }),
  role: 'landlord',
  propertyCount: 2,
});
check('a finished landlord reaches 100', landlordDone.percent, 100);
check('with nothing left to do', landlordDone.next, null);

console.log('\na tenant:');
const tenant = lib.completionFor({
  profile: profile({ full_name: 'Tara', phone: '9876543210' }),
  role: 'tenant',
  hasTenancy: true,
  hasAgreement: false,
});
check('is asked for the agreement', tenant.steps.some(s => s.id === 'agreement'), true);
check('and never for a property', tenant.steps.some(s => s.id === 'property'), false);
check('four of five done', tenant.done, 4);
check('which rounds to 80', tenant.percent, 80);
check('the agreement being what is left', tenant.next.id, 'agreement');

const tenantDone = lib.completionFor({
  profile: profile({ full_name: 'Tara', phone: '9876543210' }),
  role: 'tenant',
  hasTenancy: true,
  hasAgreement: true,
});
check('and with it uploaded, 100', tenantDone.percent, 100);

console.log('\nthe reason given changes with the role:');
const lp = lib.completionFor({ profile: profile(), role: 'landlord' }).steps.find(s => s.id === 'phone');
const tp = lib.completionFor({ profile: profile(), role: 'tenant' }).steps.find(s => s.id === 'phone');
check('a landlord is told the tenant cannot reach them', /tenant/.test(lp.why), true);
check('and a tenant, the landlord', /landlord/.test(tp.why), true);

console.log('\nmissing data does not throw:');
const nothing = lib.completionFor({ profile: null, role: null });
check('a null profile is simply nothing done', nothing.percent, 0);
check('and still names a next step', nothing.next.id, 'name');

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail === 0 ? 0 : 1);
