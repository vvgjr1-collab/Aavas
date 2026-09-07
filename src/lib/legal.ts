/**
 * The details a policy cannot be written without.
 *
 * Kept here rather than typed into the prose twice, because "last updated"
 * silently going stale is the usual way a policy stops being true.
 *
 * `contactEmail` is deliberately empty. Publishing an address nobody reads is
 * worse than publishing none, and the pages say plainly when it is missing -
 * fill it in and the line appears everywhere it belongs.
 */
export const LEGAL = {
  /** Whoever is answerable for the service. */
  operator: 'Aavas',
  /** Set this to a mailbox somebody actually watches. */
  contactEmail: '',
  /** Where a dispute would be heard. Confirm this with a lawyer. */
  jurisdiction: 'India',
  /** Change this whenever the wording below changes in substance. */
  lastUpdated: '7 September 2026',
} as const;

export const hasLegalContact = LEGAL.contactEmail.length > 0;
