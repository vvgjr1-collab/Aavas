import { supabase } from './supabase';
import type { Property, PropertyType, PropertyStatus } from '../types/property';
import type { DbProperty, DbTenancy } from './tenancy';

/**
 * The landlord portfolio, in the shape LandlordDashboard already renders.
 *
 * Composed here rather than in the screen so the component stays
 * presentational and guest mode can keep handing it the seed array.
 */

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400';

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');

/**
 * The listing wizard still records placeholder filenames rather than uploading
 * anything, and a bare "property_1234.jpg" used as an img src renders as a
 * broken image. Show only real URLs until property photos go to storage.
 */
function usableImages(paths: string[] | null | undefined): string[] {
  const usable = (paths ?? []).filter(src => src.startsWith('http'));
  return usable.length > 0 ? usable : [FALLBACK_IMAGE];
}

/**
 * A property's status follows its tenancy rather than being set by hand: a
 * property with a live tenant is occupied, whatever the column says. Explicit
 * maintenance is the one state a tenancy cannot imply, so it survives.
 */
function statusFor(property: DbProperty, tenancy: DbTenancy | undefined): PropertyStatus {
  if (property.status === 'maintenance') return 'maintenance';
  return tenancy && tenancy.status === 'active' ? 'occupied' : 'vacant';
}

export interface PortfolioResult {
  properties: Property[];
  /** Tenant-declared tenancies waiting on this landlord to confirm. */
  pendingClaims: DbTenancy[];
}

export async function fetchPortfolio(
  properties: DbProperty[],
  tenancies: DbTenancy[],
): Promise<Property[]> {
  // One profile lookup for every tenant across the portfolio, rather than one
  // per property.
  const tenantIds = Array.from(
    new Set(tenancies.map(t => t.tenant_id).filter((id): id is string => Boolean(id))),
  );

  const profiles = new Map<string, { full_name: string; email: string; phone: string | null }>();
  if (tenantIds.length > 0 && supabase) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', tenantIds);
    for (const p of data ?? []) {
      profiles.set(p.id, { full_name: p.full_name, email: p.email, phone: p.phone });
    }
  }

  return properties.map(p => {
    const tenancy = tenancies.find(
      t => t.property_id === p.id && (t.status === 'active' || t.status === 'pending'),
    );
    const profile = tenancy?.tenant_id ? profiles.get(tenancy.tenant_id) : undefined;

    return {
      id: p.id,
      title: p.title,
      address: [p.address_line, p.city, p.state, p.pincode].filter(Boolean).join(', '),
      type: (p.type as PropertyType) ?? 'apartment',
      rent: Number(tenancy?.status === 'active' ? tenancy.rent : p.rent) || 0,
      deposit: Number(tenancy?.status === 'active' ? tenancy.deposit : p.deposit) || 0,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      area: p.area_sqft,
      status: statusFor(p, tenancy),
      // Only a tenancy with someone actually in it has a tenant to show; a
      // pending invite has terms but nobody attached yet.
      tenant:
        tenancy && tenancy.tenant_id && profile
          ? {
              name: profile.full_name || profile.email || 'Tenant',
              email: profile.email || '',
              phone: profile.phone || 'Not provided',
              leaseStart: day(tenancy.start_date),
              leaseEnd: day(tenancy.end_date),
            }
          : undefined,
      amenities: p.amenities ?? [],
      // The listing wizard still records placeholder filenames rather than
      // uploading anything, and a bare "property_123.jpg" used as an img src
      // renders as a broken image. Only real URLs are shown; anything else
      // falls back until property photos actually go to storage.
      images: usableImages(p.image_paths),
      rating: Number(p.rating) || 0,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
  });
}
