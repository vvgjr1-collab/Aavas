import { requireSupabase, supabase } from './supabase';

/**
 * The conversation on a tenancy.
 *
 * One thread per tenancy rather than per pair of people: a flatshare has two
 * tenants and one landlord, and splitting that into separate threads would let
 * one flatmate miss what the other was told.
 */

export interface DbMessage {
  id: string;
  tenancy_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

const COLUMNS = 'id, tenancy_id, sender_id, body, created_at, read_at';

export const MAX_MESSAGE_LENGTH = 4000;

export async function listMessages(tenancyId: string): Promise<DbMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('messages')
    .select(COLUMNS)
    .eq('tenancy_id', tenancyId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbMessage[];
}

export async function sendMessage(input: {
  tenancyId: string;
  senderId: string;
  body: string;
}): Promise<DbMessage> {
  const client = requireSupabase();
  const body = input.body.trim();
  if (!body) throw new Error('Write something first.');
  if (body.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`);
  }

  const { data, error } = await client
    .from('messages')
    .insert({ tenancy_id: input.tenancyId, sender_id: input.senderId, body })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as DbMessage;
}

/**
 * Mark what the other side sent as read.
 *
 * Best-effort: a failure here means an unread badge lingers, which is not
 * worth interrupting anyone over.
 */
export async function markRead(tenancyId: string, viewerId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('tenancy_id', tenancyId)
    .neq('sender_id', viewerId)
    .is('read_at', null);
}

/** How many the viewer has not seen. */
export async function unreadCount(tenancyId: string, viewerId: string): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('tenancy_id', tenancyId)
    .neq('sender_id', viewerId)
    .is('read_at', null);
  if (error) return 0;
  return count ?? 0;
}
