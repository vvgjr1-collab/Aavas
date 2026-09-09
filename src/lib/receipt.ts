/**
 * Rent receipts.
 *
 * An Indian tenant claiming HRA needs a receipt from their landlord for each
 * period, and chasing one is a yearly ritual. The app already holds the two
 * things a receipt is made of: the payment, and the landlord's own
 * confirmation that they received it. This turns that pair into the document.
 *
 * The rule that shapes everything here: a receipt is the landlord
 * acknowledging money, so only a payment they have confirmed can produce one.
 * A tenant-reported payment is a claim, and printing a claim on a page headed
 * "Rent Receipt" would manufacture evidence out of one side's say-so. Those
 * rows get no receipt and say why.
 *
 * The wording is deliberately plain about what the document is. It records
 * what both parties entered in Aavas; it is not an audited instrument and
 * nobody here witnessed the money move.
 */
import { monthLabel, periodOf } from './rent';
import type { DbPayment } from './records';

/** Why a payment cannot produce a receipt, or null when it can. */
export function receiptBlock(payment: Pick<DbPayment, 'status'>): string | null {
  if (payment.status === 'paid') return null;
  if (payment.status === 'reported') {
    return 'Your landlord has not confirmed this payment yet. A receipt is their acknowledgement, so it can only be issued once they have.';
  }
  return 'This rent has not been paid yet.';
}

export const canIssueReceipt = (payment: Pick<DbPayment, 'status'>): boolean =>
  receiptBlock(payment) === null;

/**
 * A stable receipt number.
 *
 * Derived rather than counted: a sequence would need a column, and would
 * renumber itself if a payment were ever removed. Tenancy and period together
 * are unique - one rent payment per month per tenancy - and both are printed
 * on the receipt anyway, so the number is checkable by eye.
 */
export function receiptNumber(tenancyId: string, payment: DbPayment): string {
  return `AAVAS/${tenancyId.slice(0, 8).toUpperCase()}/${periodOf(payment).replace('-', '')}`;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const underThousand = (n: number): string => {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) return (TENS[Math.floor(n / 10)] + ' ' + ONES[n % 10]).trim();
  return (ONES[Math.floor(n / 100)] + ' Hundred ' + underThousand(n % 100)).trim();
};

/**
 * The rupee amount in words, grouped the Indian way - crore, lakh, thousand.
 *
 * Receipts here carry the figure in words as well as digits, which is the
 * convention and makes a single altered digit obvious.
 */
export function amountInWords(rupees: number): string {
  const n = Math.floor(Math.abs(rupees));
  if (n === 0) return 'Zero Rupees Only';

  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  if (crore) parts.push(underThousand(crore) + ' Crore');
  if (lakh) parts.push(underThousand(lakh) + ' Lakh');
  if (thousand) parts.push(underThousand(thousand) + ' Thousand');
  if (rest) parts.push(underThousand(rest));

  return parts.join(' ') + ' Rupees Only';
}

/** ₹45,000 - the Indian digit grouping, not the Western one. */
export const rupees = (n: number): string => `₹${Number(n).toLocaleString('en-IN')}`;

const longDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '--';

export interface ReceiptInput {
  payment: DbPayment;
  tenancyId: string;
  tenantName: string;
  landlordName: string;
  propertyAddress: string;
}

export interface Receipt {
  number: string;
  period: string;
  periodLabel: string;
  tenantName: string;
  landlordName: string;
  propertyAddress: string;
  amount: string;
  amountInWords: string;
  method: string;
  paidOn: string;
  dueOn: string;
  issuedOn: string;
  /** Set when the receipt would conventionally need a revenue stamp. */
  stampNote: string | null;
}

/**
 * Cash receipts above ₹5,000 conventionally carry a revenue stamp in India.
 * Saying so is more useful than silently producing a receipt that a tax
 * officer may hand back, and it is stated as the convention it is rather than
 * as advice.
 */
function stampNoteFor(method: string, amount: number): string | null {
  if (!/cash/i.test(method) || amount <= 5000) return null;
  return 'Cash payments above ₹5,000 are conventionally receipted with a ₹1 revenue stamp signed across it. Print this and ask your landlord to affix one.';
}

export function receiptFor(input: ReceiptInput): Receipt {
  const { payment } = input;
  const period = periodOf(payment);
  return {
    number: receiptNumber(input.tenancyId, payment),
    period,
    periodLabel: monthLabel(period),
    tenantName: input.tenantName,
    landlordName: input.landlordName,
    propertyAddress: input.propertyAddress,
    amount: rupees(payment.amount),
    amountInWords: amountInWords(payment.amount),
    // An empty method column reads as missing data; "Not recorded" is the
    // truth, and the app never asked for it on some of these rows.
    method: payment.method || 'Not recorded',
    paidOn: longDate(payment.paid_at ?? payment.created_at),
    dueOn: longDate(payment.due_date),
    issuedOn: longDate(new Date().toISOString()),
    stampNote: stampNoteFor(payment.method || '', Number(payment.amount)),
  };
}
