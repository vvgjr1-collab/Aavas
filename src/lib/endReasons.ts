/**
 * Why a tenancy is being ended.
 *
 * These are the clauses a standard Indian residential agreement already
 * carries, so neither party is inventing grounds - they are picking the one
 * their own agreement names. The `guidance` is what the other side reads: what
 * the clause means and what they can do about it, because a notice that says
 * only "breach of contract" tells the person receiving it nothing they can act
 * on.
 *
 * Nothing here is legally binding, and the app says so on both screens. It
 * puts the position on the record in words both parties can see, which is the
 * part that usually goes missing.
 */

export interface EndReason {
  id: string;
  label: string;
  /** Shown to the party who receives the notice. */
  guidance: string;
}

/** Grounds a landlord can give. */
export const LANDLORD_REASONS: EndReason[] = [
  {
    id: 'rent_arrears',
    label: 'Rent unpaid',
    guidance:
      'Rent has not been received for one or more months. Settling the arrears, or agreeing a date to, is normally enough to withdraw this notice.',
  },
  {
    id: 'breach_of_terms',
    label: 'Breach of the agreement',
    guidance:
      'A term of the agreement has not been kept - subletting, unapproved alterations, or use of the property beyond what was agreed. Putting the breach right is normally enough to withdraw this notice.',
  },
  {
    id: 'nuisance',
    label: 'Nuisance or damage',
    guidance:
      'Repeated disturbance to neighbours, or damage beyond fair wear and tear. Repairs at the tenant’s cost, or an agreed change in conduct, are the usual remedies.',
  },
  {
    id: 'owner_needs_property',
    label: 'Owner needs the property',
    guidance:
      'The owner intends to occupy or sell the property. This is no fault of the tenant, and notice periods in the agreement apply in full.',
  },
  {
    id: 'end_of_term',
    label: 'End of the agreed term',
    guidance:
      'The lease is running to its end date and will not be renewed. Nothing is owed beyond the terms already agreed.',
  },
];

/** Grounds a tenant can give. */
export const TENANT_REASONS: EndReason[] = [
  {
    id: 'moving_out',
    label: 'Moving out',
    guidance: 'The tenant is leaving - relocation, a change of job, or personal circumstances.',
  },
  {
    id: 'end_of_term',
    label: 'End of the agreed term',
    guidance: 'The lease is running to its end date and will not be renewed.',
  },
  {
    id: 'unresolved_maintenance',
    label: 'Maintenance left unresolved',
    guidance:
      'Repairs the owner is responsible for have been reported and not carried out. Completing them is normally enough for this notice to be withdrawn.',
  },
  {
    id: 'other',
    label: 'Another reason',
    guidance: 'The tenant has given their reason in their own words below.',
  },
];

export const ALL_REASONS: EndReason[] = [
  ...LANDLORD_REASONS,
  ...TENANT_REASONS.filter(t => !LANDLORD_REASONS.some(l => l.id === t.id)),
];

/** The stored value is an id; older rows may hold a bare label or nothing. */
export function describeReason(id: string | null | undefined): EndReason | null {
  if (!id) return null;
  return ALL_REASONS.find(r => r.id === id) ?? { id, label: id, guidance: '' };
}
