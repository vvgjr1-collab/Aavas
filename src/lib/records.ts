import { requireSupabase, supabase } from './supabase';

/**
 * Payments, complaints and service bookings.
 *
 * Everything here is keyed by tenancy_id, and RLS narrows every read to
 * tenancies the caller is a party to - so "my payments" is just a select.
 */

export type PaymentStatus = 'due' | 'reported' | 'paid';

export interface DbPayment {
  id: string;
  tenancy_id: string;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  method: string;
  reference: string;
  status: PaymentStatus;
  recorded_by: string;
  created_at: string;
}

export interface DbComplaint {
  id: string;
  tenancy_id: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_by: string;
  created_at: string;
}

export interface DbBooking {
  id: string;
  tenancy_id: string;
  provider_name: string;
  category: string;
  scheduled_for: string | null;
  notes: string;
  status: string;
  created_at: string;
}

const PAYMENT_COLUMNS =
  'id, tenancy_id, amount, due_date, paid_at, method, reference, status, recorded_by, created_at';

export async function listPayments(tenancyId: string): Promise<DbPayment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('payments')
    .select(PAYMENT_COLUMNS)
    .eq('tenancy_id', tenancyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbPayment[];
}

/**
 * Record a rent payment the tenant says they have made.
 *
 * Status is 'reported', never 'paid': confirming receipt is the landlord's
 * call, and the insert policy refuses a tenant who tries to claim otherwise.
 * The app should not ask the database to reject something it could simply not
 * request.
 */
export async function reportPayment(input: {
  tenancyId: string;
  userId: string;
  amount: number;
  method: string;
  reference?: string;
  dueDate?: string | null;
}): Promise<DbPayment> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('payments')
    .insert({
      tenancy_id: input.tenancyId,
      recorded_by: input.userId,
      amount: input.amount,
      method: input.method,
      reference: input.reference ?? '',
      due_date: input.dueDate ?? null,
      status: 'reported',
      paid_at: new Date().toISOString(),
    })
    .select(PAYMENT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as DbPayment;
}

const COMPLAINT_COLUMNS =
  'id, tenancy_id, category, title, description, priority, status, created_by, created_at';

export async function listComplaints(tenancyId: string): Promise<DbComplaint[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('complaints')
    .select(COMPLAINT_COLUMNS)
    .eq('tenancy_id', tenancyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbComplaint[];
}

export async function createComplaint(input: {
  tenancyId: string;
  userId: string;
  category: string;
  title: string;
  description: string;
  priority: string;
}): Promise<DbComplaint> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('complaints')
    .insert({
      tenancy_id: input.tenancyId,
      created_by: input.userId,
      category: input.category,
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: 'open',
    })
    .select(COMPLAINT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as DbComplaint;
}

const BOOKING_COLUMNS =
  'id, tenancy_id, provider_name, category, scheduled_for, notes, status, created_at';

export async function listBookings(tenancyId: string): Promise<DbBooking[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('service_bookings')
    .select(BOOKING_COLUMNS)
    .eq('tenancy_id', tenancyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbBooking[];
}

export async function createBooking(input: {
  tenancyId: string;
  userId: string;
  providerName: string;
  category: string;
  scheduledFor?: string | null;
  notes?: string;
}): Promise<DbBooking> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('service_bookings')
    .insert({
      tenancy_id: input.tenancyId,
      created_by: input.userId,
      provider_name: input.providerName,
      category: input.category,
      scheduled_for: input.scheduledFor ?? null,
      notes: input.notes ?? '',
      status: 'requested',
    })
    .select(BOOKING_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as DbBooking;
}

/* -------------------------------------------------------------------------
 * Documents
 * ---------------------------------------------------------------------- */

export interface DbDocument {
  id: string;
  tenancy_id: string;
  kind: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
}

export const DOCUMENTS_BUCKET = 'documents';

/**
 * Objects are filed as tenancies/<id>/<kind>/<file> because that is what the
 * storage policy authorises from - see app.can_access_document_path(). Keep
 * this in step with the migration or uploads start failing with a policy error.
 */
export function documentPath(tenancyId: string, kind: string, fileName: string): string {
  const safe = fileName.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80);
  return `tenancies/${tenancyId}/${kind}/${Date.now()}-${safe}`;
}

export async function listDocuments(
  tenancyId: string,
  kind?: string,
): Promise<DbDocument[]> {
  if (!supabase) return [];
  let query = supabase
    .from('documents')
    .select('id, tenancy_id, kind, storage_path, file_name, mime_type, size_bytes, uploaded_by, created_at')
    .eq('tenancy_id', tenancyId);
  if (kind) query = query.eq('kind', kind);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbDocument[];
}

/** Upload a file and record it. The row is what the app lists; the object is the file. */
export async function uploadDocument(input: {
  tenancyId: string;
  userId: string;
  kind: string;
  file: File;
}): Promise<DbDocument> {
  const client = requireSupabase();
  const path = documentPath(input.tenancyId, input.kind, input.file.name);

  const { error: uploadError } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, input.file, { upsert: false, contentType: input.file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await client
    .from('documents')
    .insert({
      tenancy_id: input.tenancyId,
      uploaded_by: input.userId,
      kind: input.kind,
      storage_path: path,
      file_name: input.file.name,
      mime_type: input.file.type,
      size_bytes: input.file.size,
    })
    .select('id, tenancy_id, kind, storage_path, file_name, mime_type, size_bytes, uploaded_by, created_at')
    .single();

  if (error) {
    // Don't leave an orphan object behind when the row fails.
    await client.storage.from(DOCUMENTS_BUCKET).remove([path]).catch(() => {});
    throw new Error(error.message);
  }
  return data as DbDocument;
}

/** The bucket is private, so viewing needs a short-lived signed URL. */
export async function signedDocumentUrl(path: string, seconds = 300): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, seconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
