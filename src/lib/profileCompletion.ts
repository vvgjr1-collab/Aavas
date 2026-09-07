import type { Profile } from './auth';

/**
 * How far an account is from being usable, and what is missing.
 *
 * Sign-up asks for a name, an email and a password, which is the least it can
 * ask without becoming a form people abandon. Everything else - a phone number
 * a landlord can actually ring, the agreement both sides need a copy of - has
 * to be collected later, and until something says so it simply never is.
 *
 * The steps are deliberately the ones that matter to the other party, not a
 * checklist for its own sake. A profile photo would raise the number and help
 * nobody.
 */

export type CompletionRole = 'tenant' | 'landlord' | null;

export interface CompletionStep {
  id: string;
  label: string;
  /** Why it matters to somebody else, not to us. */
  why: string;
  done: boolean;
  /** Where to go to do it, as a route. */
  href?: string;
}

export interface CompletionInputs {
  profile: Profile | null;
  role: CompletionRole;
  /** Landlord: properties they own. */
  propertyCount?: number;
  /** Tenant: whether they are on a live tenancy. */
  hasTenancy?: boolean;
  /** Whether an agreement document exists on that tenancy. */
  hasAgreement?: boolean;
}

export interface Completion {
  steps: CompletionStep[];
  done: number;
  total: number;
  percent: number;
  /** The first thing still worth doing, if any. */
  next: CompletionStep | null;
}

const hasText = (v: string | null | undefined) => Boolean(v && v.trim().length > 0);

/** A phone number worth storing: 8-15 digits, however it is punctuated. */
export function looksLikePhone(value: string | null | undefined): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

export function completionFor(input: CompletionInputs): Completion {
  const { profile, role } = input;

  const steps: CompletionStep[] = [
    {
      id: 'name',
      label: 'Your name',
      why: 'The other party sees this instead of an email address.',
      done: hasText(profile?.full_name),
      href: '/account',
    },
    {
      id: 'phone',
      label: 'A phone number',
      why:
        role === 'landlord'
          ? 'Your tenant has no other way to reach you quickly.'
          : 'Your landlord has no other way to reach you quickly.',
      done: looksLikePhone(profile?.phone),
      href: '/account',
    },
    {
      id: 'role',
      label: 'Choose how you are using Aavas',
      why: 'Tenant or landlord decides which dashboard opens.',
      done: role !== null,
      href: '/role',
    },
  ];

  if (role === 'landlord') {
    steps.push({
      id: 'property',
      label: 'Add a property',
      why: 'Nothing else works until there is one to manage.',
      done: (input.propertyCount ?? 0) > 0,
      href: '/landlord/properties/new',
    });
  }

  if (role === 'tenant') {
    steps.push({
      id: 'tenancy',
      label: 'Join your tenancy',
      why: 'Use the code from your landlord, or enter the details yourself.',
      done: Boolean(input.hasTenancy),
      href: '/tenant/setup',
    });
    steps.push({
      id: 'agreement',
      label: 'Upload your rent agreement',
      why: 'Both of you get a copy, and neither has to find the paper one.',
      done: Boolean(input.hasAgreement),
      href: '/tenant/rent',
    });
  }

  const done = steps.filter(s => s.done).length;
  const total = steps.length;
  return {
    steps,
    done,
    total,
    percent: total === 0 ? 100 : Math.round((done / total) * 100),
    next: steps.find(s => !s.done) ?? null,
  };
}
