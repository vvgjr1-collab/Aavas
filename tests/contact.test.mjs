/**
 * Phone numbers and email addresses, on the way to the device.
 *
 * This file exists because of one missing backslash. `/[^d+]/g` instead of
 * `/[^\d+]/g` shipped to production, reads correctly at a glance, leaves the
 * button enabled and the number on screen, and hands the dialler "tel:+".
 * Nothing about the app looks wrong. The only thing that catches it is
 * asserting on the string that actually gets built.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { transformSync } from 'esbuild';

const { code } = transformSync(
  readFileSync(new URL('../src/lib/contact.ts', import.meta.url), 'utf8'),
  { loader: 'ts', format: 'esm' },
);
const dir = mkdtempSync(join(tmpdir(), 'contact-'));
const file = join(dir, 'contact.mjs');
writeFileSync(file, code);
const { dialable, mailtoHref } = await import(pathToFileURL(file).href);

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
      '\n        got      ' + JSON.stringify(actual),
    );
  }
};

console.log('\na number the phone can actually dial:');

check('an Indian mobile as people write it', dialable('+91 98765 43210'), '+919876543210');
check('the country code survives', dialable('+919876543210'), '+919876543210');
check('a local number stays local', dialable('9876543210'), '9876543210');
check('brackets, dashes and dots come out', dialable('(022) 2857-1234'), '02228571234');
check('a landline with spaces', dialable('022 2857 1234'), '02228571234');

console.log('\nand nothing, when there is nothing:');

check('empty', dialable(''), null);
check('null', dialable(null), null);
check('undefined', dialable(undefined), null);
check('whitespace only', dialable('   '), null);
// The two placeholder sentences that have been stored in this field. Both are
// truthy, and both used to reach the dialler.
check('"Not provided" is not a number', dialable('Not provided'), null);
check('"No number given" is not a number', dialable('No number given'), null);
check('a stray digit is not a number either', dialable('12'), null);

console.log('\nthe mailto URL:');

check('a plain address', mailtoHref('asha@example.com'), 'mailto:asha@example.com');
check(
  'a subject is encoded, not concatenated',
  mailtoHref('asha@example.com', '2 BHK, Bandra & Khar'),
  'mailto:asha@example.com?subject=2%20BHK%2C%20Bandra%20%26%20Khar',
);
check('surrounding space is trimmed', mailtoHref('  asha@example.com  '), 'mailto:asha@example.com');
check('plus addressing survives', mailtoHref('asha+rent@example.com'), 'mailto:asha+rent@example.com');

check('an empty address gives no link', mailtoHref(''), null);
check('null gives no link', mailtoHref(null), null);
check('a placeholder dash is not an address', mailtoHref('--'), null);
check('a name is not an address', mailtoHref('Asha Rao'), null);
check('half an address is not an address', mailtoHref('asha@'), null);
check('nor is one without a dot', mailtoHref('asha@example'), null);
check('nor one with a space in it', mailtoHref('asha rao@example.com'), null);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
