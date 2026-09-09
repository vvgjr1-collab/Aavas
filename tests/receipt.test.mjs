/**
 * Rent receipts: who may have one, and what it says.
 *
 * Two things here are worth pinning down away from a browser. The first is the
 * rule that a receipt needs the landlord's confirmation - the whole point of
 * the document, and the one mistake that would turn it into manufactured
 * evidence. The second is the amount in words, which groups by lakh and crore
 * rather than by thousands, and which no amount of clicking around in the app
 * would exercise past a few thousand rupees.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { transformSync } from 'esbuild';

// receipt.ts imports rent.ts, so both are stripped into the same directory and
// the relative import between them resolves as it does in the app.
const dir = mkdtempSync(join(tmpdir(), 'receipt-'));
for (const name of ['rent', 'receipt']) {
  const { code } = transformSync(
    readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8'),
    { loader: 'ts', format: 'esm' },
  );
  // esbuild normalises the quotes, so match either kind.
  writeFileSync(join(dir, `${name}.mjs`), code.replace(/from ['"]\.\/rent['"]/g, "from './rent.mjs'"));
}
const receipt = await import(pathToFileURL(join(dir, 'receipt.mjs')).href);

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

const payment = (over = {}) => ({
  id: 'p1',
  tenancy_id: 't1',
  amount: 45000,
  due_date: '2026-03-01',
  paid_at: '2026-03-01T09:00:00.000Z',
  method: 'UPI',
  reference: '',
  status: 'paid',
  recorded_by: 'u1',
  created_at: '2026-03-01T09:00:00.000Z',
  ...over,
});

console.log('\nonly a confirmed payment can be receipted:');

check('a payment the landlord has confirmed can', receipt.canIssueReceipt(payment()), true);
check(
  'one the tenant has only reported cannot',
  receipt.canIssueReceipt(payment({ status: 'reported' })),
  false,
);
check('and rent that is merely due cannot', receipt.canIssueReceipt(payment({ status: 'due' })), false);

check(
  'a reported payment says it is waiting on the landlord',
  /landlord has not confirmed/.test(receipt.receiptBlock(payment({ status: 'reported' }))),
  true,
);
check('a confirmed one gives no reason, because there is none', receipt.receiptBlock(payment()), null);

console.log('\nthe amount in words, grouped the Indian way:');

check('a plain thousand', receipt.amountInWords(45000), 'Forty Five Thousand Rupees Only');
check('a lakh, not a hundred thousand', receipt.amountInWords(135000), 'One Lakh Thirty Five Thousand Rupees Only');
check('the teens do not become "ten five"', receipt.amountInWords(15000), 'Fifteen Thousand Rupees Only');
check('hundreds inside a thousand', receipt.amountInWords(8500), 'Eight Thousand Five Hundred Rupees Only');
check('a crore', receipt.amountInWords(12500000), 'One Crore Twenty Five Lakh Rupees Only');
check('a single rupee', receipt.amountInWords(1), 'One Rupees Only');
check('nothing at all still reads as an amount', receipt.amountInWords(0), 'Zero Rupees Only');
check('paise are dropped rather than half-printed', receipt.amountInWords(45000.75), 'Forty Five Thousand Rupees Only');

console.log('\nthe receipt itself:');

const r = receipt.receiptFor({
  payment: payment(),
  tenancyId: '9a114fbd-3744-4275-8475-dd8036124594',
  tenantName: 'Asha Rao',
  landlordName: 'Varun G',
  propertyAddress: '12 Hill Road, Mumbai',
});

check('the number is derived from the tenancy and the period', r.number, 'AAVAS/9A114FBD/202603');
check('it names the month the rent was for', r.periodLabel, 'March 2026');
check('the figure carries Indian digit grouping', r.amount, '₹45,000');
check('and is repeated in words', r.amountInWords, 'Forty Five Thousand Rupees Only');
check('both parties are named', [r.tenantName, r.landlordName], ['Asha Rao', 'Varun G']);

// A date column names its own month. Reading it as a timestamp would put a
// payment due on the 1st into the previous month anywhere west of Greenwich -
// the same bug rent.ts carries a comment about.
check(
  'a due date on the first is not dragged into the month before',
  receipt.receiptFor({
    payment: payment({ due_date: '2026-01-01', paid_at: '2026-01-01T09:00:00.000Z' }),
    tenancyId: 'aaaaaaaa-0000-0000-0000-000000000000',
    tenantName: 'A',
    landlordName: 'B',
    propertyAddress: 'C',
  }).periodLabel,
  'January 2026',
);

check('a missing method says so rather than showing a gap', receipt.receiptFor({
  payment: payment({ method: '' }),
  tenancyId: 't', tenantName: 'A', landlordName: 'B', propertyAddress: 'C',
}).method, 'Not recorded');

console.log('\nthe revenue stamp note, which only applies to cash:');

const stampFor = over => receipt.receiptFor({
  payment: payment(over),
  tenancyId: 't', tenantName: 'A', landlordName: 'B', propertyAddress: 'C',
}).stampNote;

check('cash above five thousand mentions the stamp', /revenue stamp/.test(stampFor({ method: 'Cash' })), true);
check('cash at or below five thousand does not', stampFor({ method: 'Cash', amount: 5000 }), null);
check('a bank transfer never does', stampFor({ method: 'Bank Transfer' }), null);
check('nor does UPI, whatever the size', stampFor({ method: 'UPI', amount: 200000 }), null);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
