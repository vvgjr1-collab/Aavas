import { supabase } from './supabase';
import type { DbTenancy } from './tenancy';

/**
 * What the tenant dashboard renders.
 *
 * Deliberately the same shape as the hardcoded object it replaces, so the
 * screen keeps reading `propertyData.lease.monthlyRent` and the change is
 * confined to where the numbers come from.
 */
export interface TenantPropertyView {
  address: string;
  city: string;
  owner: { name: string; phone: string; email: string };
  lease: {
    startDate: string;
    endDate: string;
    monthlyRent: string;
    deposit: string;
  };
  nextRentDue: string;
  propertyType: string;
  /** Seed data for guest mode rather than anyone's real tenancy. */
  isDemo: boolean;
  /**
   * A tenant-declared tenancy the landlord has not agreed yet. The figures are
   * the tenant's own claim, so the screen has to say so rather than presenting
   * them as settled terms.
   */
  isUnconfirmed: boolean;
}

const money = (n: number | null | undefined) =>
  n == null ? '--' : `₹${Number(n).toLocaleString('en-IN')}`;

const day = (iso: string | null | undefined) => {
  if (!iso) return '--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/** Rent falls due on the 1st; show the next one that has not passed. */
function nextRentDue(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return day(next.toISOString());
}

/** The original hardcoded flat, kept for guest mode so the demo still reads. */
export const DEMO_VIEW: TenantPropertyView = {
  address: '123 Sunset Boulevard, Apt 4B',
  city: 'Mumbai, MH 400001',
  owner: {
    name: 'Sarah Johnson',
    phone: '+91 98765 43210',
    email: 'sarah.johnson@properties.com',
  },
  lease: {
    startDate: 'Jan 15, 2024',
    endDate: 'Jan 14, 2025',
    monthlyRent: '₹45,000',
    deposit: '₹90,000',
  },
  nextRentDue: 'Dec 1, 2024',
  propertyType: '2BR/2BA Apartment',
  isDemo: true,
  isUnconfirmed: false,
};

const describeType = (type: string, beds: number, baths: number) => {
  const label = type ? type[0].toUpperCase() + type.slice(1) : 'Property';
  return beds || baths ? `${beds}BR/${baths}BA ${label}` : label;
};

/**
 * Build the dashboard view from a tenancy.
 *
 * Both paths are handled. A confirmed tenancy has a property and a landlord to
 * read from. A tenant-declared one has neither yet - only the address the
 * tenant typed and the figures they proposed - so those are used and flagged.
 */
export async function fetchTenantView(
  tenancy: DbTenancy,
): Promise<TenantPropertyView> {
  const unconfirmed = tenancy.status === 'pending';

  let address = tenancy.claimed_address ?? '--';
  let city = '';
  let propertyType = 'Property';

  if (tenancy.property_id && supabase) {
    const { data } = await supabase
      .from('properties')
      .select('title, address_line, city, state, pincode, type, bedrooms, bathrooms')
      .eq('id', tenancy.property_id)
      .maybeSingle();
    if (data) {
      address = data.address_line;
      city = [data.city, data.state, data.pincode].filter(Boolean).join(', ');
      propertyType = describeType(data.type, data.bedrooms, data.bathrooms);
    }
  }

  let owner = {
    name: tenancy.claimed_landlord_email ? 'Awaiting confirmation' : '--',
    phone: '--',
    email: tenancy.claimed_landlord_email ?? '--',
  };

  if (tenancy.landlord_id && supabase) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', tenancy.landlord_id)
      .maybeSingle();
    if (data) {
      owner = {
        name: data.full_name || data.email || 'Your landlord',
        phone: data.phone || 'Not provided',
        email: data.email || '--',
      };
    }
  }

  // While pending, the only figures that exist are the tenant's proposal.
  const rent = unconfirmed ? tenancy.proposed_rent : tenancy.rent;
  const deposit = unconfirmed ? tenancy.proposed_deposit : tenancy.deposit;
  const start = unconfirmed ? tenancy.proposed_start_date : tenancy.start_date;
  const end = unconfirmed ? tenancy.proposed_end_date : tenancy.end_date;

  return {
    address,
    city,
    owner,
    lease: {
      startDate: day(start),
      endDate: day(end),
      monthlyRent: money(rent),
      deposit: money(deposit),
    },
    nextRentDue: nextRentDue(),
    propertyType,
    isDemo: false,
    isUnconfirmed: unconfirmed,
  };
}
