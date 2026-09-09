/**
 * Drawing a rent receipt.
 *
 * Kept apart from receipt.ts so the wording and the rules stay testable
 * without a PDF engine, and apart from the component so the page does not
 * carry jsPDF until somebody actually asks for a receipt.
 */
import type { Receipt } from './receipt';

const TEAL: [number, number, number] = [44, 122, 123];

/**
 * jsPDF's built-in fonts are WinAnsi, which has no U+20B9. Printing "₹" with
 * them produces a wrong glyph or nothing at all, so the PDF says "Rs." - the
 * older convention, and still the common one on Indian receipts. The screen,
 * which has real fonts, keeps the symbol.
 */
const forPdf = (amount: string): string => amount.replace(/₹\s*/g, 'Rs. ');

export async function downloadReceipt(receipt: Receipt): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const width = pageWidth - margin * 2;
  let y = margin;

  const wrapped = (text: string, size: number, lineHeight = 5.5): void => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, margin, y);
    y += lines.length * lineHeight;
  };

  // Header
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('AAVAS', margin, 20);
  doc.setFontSize(12);
  doc.text('Rent Receipt', margin, 30);

  doc.setTextColor(0, 0, 0);
  y = 55;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Receipt No: ${receipt.number}`, margin, y);
  doc.text(`Issued: ${receipt.issuedOn}`, pageWidth - margin, y, { align: 'right' });
  y += 10;

  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  doc.setTextColor(...TEAL);
  doc.setFontSize(16);
  doc.text(`RENT RECEIPT - ${receipt.periodLabel.toUpperCase()}`, margin, y);
  y += 12;

  // The sentence a receipt exists to make.
  doc.setTextColor(0, 0, 0);
  wrapped(
    `Received from ${receipt.tenantName} the sum of ${forPdf(receipt.amount)} ` +
      `(${receipt.amountInWords}) towards rent for ${receipt.periodLabel} ` +
      `in respect of the property at ${receipt.propertyAddress}.`,
    11,
    6,
  );
  y += 8;

  const row = (label: string, value: string): void => {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(label, margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(value, margin + 45, y);
    y += 8;
  };

  doc.setFontSize(12);
  doc.setTextColor(...TEAL);
  doc.text('DETAILS', margin, y);
  y += 8;

  row('Rent period', receipt.periodLabel);
  row('Amount', forPdf(receipt.amount));
  row('In words', receipt.amountInWords);
  row('Paid on', receipt.paidOn);
  row('Rent due on', receipt.dueOn);
  row('Method', receipt.method);
  row('Tenant', receipt.tenantName);
  row('Landlord', receipt.landlordName);
  y += 6;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // Signature block. The confirmation is the real attestation; the blank line
  // is there because a printed receipt is often signed by hand as well, and
  // for the revenue stamp where one is expected.
  doc.setTextColor(0, 0, 0);
  wrapped(
    `Confirmed as received by ${receipt.landlordName} in Aavas. ` +
      `This receipt was generated from that confirmation.`,
    10,
    5,
  );
  y += 14;
  doc.setDrawColor(120, 120, 120);
  doc.line(pageWidth - margin - 60, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Landlord's signature", pageWidth - margin, y, { align: 'right' });
  y += 14;

  if (receipt.stampNote) {
    doc.setTextColor(150, 90, 0);
    // The note names two rupee amounts of its own, and they need the same
    // treatment as the figures above - a "₹" here silently drops the line.
    wrapped(forPdf(receipt.stampNote), 9, 4.5);
    y += 6;
  }

  // What this document is, said plainly. Overstating it would be the one way
  // a receipt like this could do somebody harm.
  doc.setTextColor(120, 120, 120);
  wrapped(
    'This receipt records what the tenant and landlord each entered in Aavas: ' +
      'the tenant reported this payment and the landlord confirmed receiving it. ' +
      'Aavas does not handle the money and did not witness the transfer.',
    8.5,
    4,
  );

  doc.save(`Rent-Receipt-${receipt.period}.pdf`);
}
