import { requireSupabase, supabase } from './supabase';

/**
 * Data access for properties, tenancies and invites.
 *
 * Every read here is already narrowed by Row Level Security - "my properties"
 * is just `select * from properties`, because the policy only ever returns the
 * caller's own. Nothing in this file re-checks ownership; doing so in the
 * client would be theatre, since the database is the thing being trusted.
 */

export type TenancyStatus = 'pending' | 'active' | 'ended' | 'rejected';
export type TenancySource = 'landlord' | 'tenant';

export interface DbProperty {
  id: string;
  landlord_id: string;
  title: string;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  type: string;
  status: string;
  rent: number;
  deposit: number;
  bedrooms: number;
  bathrooms: number;
  area_sqft: number;
  amenities: string[];
  image_paths: string[];
  rating: number;
}

export interface DbTenancy {
  id: string;
  property_id: string | null;
  landlord_id: string | null;
  tenant_id: string | null;
  claimed_address: string | null;
  claimed_landlord_email: string | null;
  source: TenancySource;
  status: TenancyStatus;
  rent: number;
  deposit: number;
  start_date: string | null;
  end_date: string | null;
  proposed_rent: number | null;
  proposed_deposit: number | null;
  proposed_start_date: string | null;
  proposed_end_date: string | null;
  confirmed_at: string | null;
}

const PROPERTY_COLUMNS =
  'id, landlord_id, title, address_line, city, state, pincode, type, status, rent, deposit, bedrooms, bathrooms, area_sqft, amenities, image_paths, rating';

const TENANCY_COLUMNS =
  'id, property_id, landlord_id, tenant_id, claimed_address, claimed_landlord_email, source, status, rent, deposit, start_date, end_date, proposed_rent, proposed_deposit, proposed_start_date, proposed_end_date, confirmed_at';

/** Postgres messages are for developers; these are the ones a person can act on. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('tenancies_one_live_per_property')) {
    return 'That property already has a live tenancy.';
  }
  if (m.includes('duplicate key') && m.includes('invites_code')) {
    return 'Could not generate a unique code. Please try again.';
  }
  if (m.includes('violates row-level security')) {
    return 'You do not have permission to do that.';
  }
  return message;
}

function fail(message: string): never {
  throw new Error(friendly(message));
}

export async function listMyProperties(): Promise<DbProperty[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('properties')
    .select(PROPERTY_COLUMNS)
    .order('created_at', { ascending: true });
  if (error) fail(error.message);
  return (data ?? []) as DbProperty[];
}

/** Every tenancy the caller is a party to, either side. */
export async function listMyTenancies(): Promise<DbTenancy[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('tenancies')
    .select(TENANCY_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) fail(error.message);
  return (data ?? []) as DbTenancy[];
}

export interface NewPropertyInput {
  title: string;
  address_line: string;
  city: string;
  state?: string;
  pincode?: string;
  type?: string;
  rent: number;
  deposit: number;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  amenities?: string[];
}

export async function createProperty(
  landlordId: string,
  input: NewPropertyInput,
): Promise<DbProperty> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('properties')
    .insert({
      landlord_id: landlordId,
      title: input.title,
      address_line: input.address_line,
      city: input.city,
      state: input.state ?? '',
      pincode: input.pincode ?? '',
      type: input.type ?? 'apartment',
      rent: input.rent,
      deposit: input.deposit,
      bedrooms: input.bedrooms ?? 0,
      bathrooms: input.bathrooms ?? 0,
      area_sqft: input.area_sqft ?? 0,
      amenities: input.amenities ?? [],
    })
    .select(PROPERTY_COLUMNS)
    .single();
  if (error) fail(error.message);
  return data as DbProperty;
}

export interface TenancyTerms {
  rent: number;
  deposit: number;
  start_date: string | null;
  end_date: string | null;
}

/** Landlord-first: open a tenancy on a property, ready to be invited into. */
export async function createTenancyForProperty(
  landlordId: string,
  propertyId: string,
  terms: TenancyTerms,
): Promise<DbTenancy> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('tenancies')
    .insert({
      property_id: propertyId,
      landlord_id: landlordId,
      source: 'landlord',
      status: 'pending',
      created_by: landlordId,
      rent: terms.rent,
      deposit: terms.deposit,
      start_date: terms.start_date,
      end_date: terms.end_date,
    })
    .select(TENANCY_COLUMNS)
    .single();
  if (error) fail(error.message);
  return data as DbTenancy;
}

// Deliberately excludes 0/O/1/I/L: these codes get read aloud and retyped.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

/**
 * Issue an invite code for a tenancy.
 *
 * The unique index on invites.code is what actually guarantees uniqueness; a
 * couple of retries cover the vanishingly unlikely collision rather than
 * pretending it cannot happen.
 */
export async function createInvite(
  tenancyId: string,
  createdBy: string,
  email?: string,
): Promise<string> {
  const client = requireSupabase();
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode();
    const { error } = await client.from('invites').insert({
      tenancy_id: tenancyId,
      code,
      email: email ?? null,
      created_by: createdBy,
    });
    if (!error) return code;
    if (!error.message.toLowerCase().includes('duplicate key')) fail(error.message);
  }
  throw new Error('Could not generate a unique invite code. Please try again.');
}

/** Tenant-first: redeem a code. Returns the tenancy id it joined. */
export async function redeemInvite(code: string): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('redeem_invite', {
    p_code: code.trim().toUpperCase(),
  });
  if (error) fail(error.message);
  return data as string;
}

export interface TenancyClaimInput {
  claimed_address: string;
  claimed_landlord_email: string;
  proposed_rent: number | null;
  proposed_deposit: number | null;
  proposed_start_date: string | null;
  proposed_end_date: string | null;
}

/**
 * Tenant-first: declare the tenancy you already live in.
 *
 * The figures go into proposed_* and stay there. They are a claim, not an
 * agreement - the landlord's confirmation is what sets the real terms, which
 * is the rule the rent agreement encodes.
 */
export async function createTenancyClaim(
  tenantId: string,
  input: TenancyClaimInput,
): Promise<DbTenancy> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('tenancies')
    .insert({
      tenant_id: tenantId,
      created_by: tenantId,
      source: 'tenant',
      status: 'pending',
      claimed_address: input.claimed_address,
      claimed_landlord_email: input.claimed_landlord_email,
      proposed_rent: input.proposed_rent,
      proposed_deposit: input.proposed_deposit,
      proposed_start_date: input.proposed_start_date,
      proposed_end_date: input.proposed_end_date,
    })
    .select(TENANCY_COLUMNS)
    .single();
  if (error) fail(error.message);
  return data as DbTenancy;
}

/** Landlord side of the tenant-first path: claims addressed to my email. */
export async function listPendingClaims(): Promise<DbTenancy[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('pending_claims_for_me');
  if (error) fail(error.message);
  return (data ?? []) as DbTenancy[];
}

export async function confirmTenancy(input: {
  tenancyId: string;
  propertyId: string;
  rent: number;
  deposit: number;
  startDate: string | null;
  endDate: string | null;
}): Promise<DbTenancy> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('confirm_tenancy', {
    p_tenancy_id: input.tenancyId,
    p_property_id: input.propertyId,
    p_rent: input.rent,
    p_deposit: input.deposit,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
  });
  if (error) fail(error.message);
  return (Array.isArray(data) ? data[0] : data) as DbTenancy;
}

export async function rejectTenancyClaim(tenancyId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('reject_tenancy_claim', { p_tenancy_id: tenancyId });
  if (error) fail(error.message);
}

/** A tenancy that is live, or waiting on the landlord, counts as set up. */
export const isLiveTenancy = (t: DbTenancy) =>
  t.status === 'active' || t.status === 'pending';
