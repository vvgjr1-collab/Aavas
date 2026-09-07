-- Messages between the two sides of a tenancy, and a place for verification
-- paperwork.
--
-- Both screens that show a conversation were rendering a hardcoded exchange
-- about a plumber. A landlord and tenant could each type into a box and watch
-- their own words appear, having sent nothing to anybody. This is the table
-- that makes the box mean something.
--
-- Messages are immutable once sent. There is no update policy for the body and
-- no delete: a record of what was said between two parties is worth more than
-- the convenience of taking it back, and a "message" that either side could
-- rewrite afterwards would be evidence of nothing. Only the read marker moves,
-- and only in one direction.

-- ---------------------------------------------------------------------------
-- Police verification joins the document kinds
--
-- Adding an enum value is its own statement deliberately: Postgres will not let
-- a value be used in the same transaction that adds it.
-- ---------------------------------------------------------------------------

alter type public.document_kind add value if not exists 'police_verification';
alter type public.document_kind add value if not exists 'address_proof';

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  -- Bounded on purpose: text is unbounded in Postgres, and an unbounded column
  -- that anyone on a tenancy can write to is a way to fill the database.
  body       text not null check (length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  -- Set once by the person who did not send it.
  read_at    timestamptz
);

create index messages_tenancy_created_idx
  on public.messages (tenancy_id, created_at desc);

alter table public.messages enable row level security;
grant select, insert, update on public.messages to authenticated;
-- Explicit, not implied: Supabase grants default privileges on every new
-- object in public, so a table is deletable-by-grant unless something says
-- otherwise. Row Level Security would still filter such a delete to no rows,
-- but a privilege nobody should hold is not worth holding.
revoke delete, truncate, references, trigger on public.messages from authenticated;
revoke all on public.messages from anon;

/** Everyone on the lease, plus the landlord. Flatmates share one conversation. */
create or replace function app.can_message_on(p_tenancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app.is_tenancy_party(p_tenancy_id) or app.is_tenancy_member(p_tenancy_id);
$$;

revoke all on function app.can_message_on(uuid) from public, anon;
grant execute on function app.can_message_on(uuid) to authenticated;

create policy messages_select_party on public.messages
  for select to authenticated
  using (app.can_message_on(tenancy_id));

create policy messages_insert_self on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and app.can_message_on(tenancy_id));

-- Update exists only so the recipient can mark a message read. The trigger
-- below is what stops it being a way to edit somebody else's words.
create policy messages_update_recipient on public.messages
  for update to authenticated
  using (app.can_message_on(tenancy_id) and sender_id <> auth.uid())
  with check (app.can_message_on(tenancy_id) and sender_id <> auth.uid());

/**
 * Only read_at may change, and only from null.
 *
 * Without this, the update policy above would let the person receiving a
 * message rewrite what the sender said - the opposite of what a record of a
 * conversation is for.
 */
create or replace function app.enforce_message_immutable()
returns trigger
language plpgsql
-- SECURITY INVOKER, like app.enforce_tenancy_authority: this reads only OLD
-- and NEW, and as DEFINER the current_user check below would pass for everyone.
security invoker
set search_path = public, pg_temp
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenancy_id is distinct from old.tenancy_id
     or new.sender_id is distinct from old.sender_id
     or new.body is distinct from old.body
     or new.created_at is distinct from old.created_at
  then
    raise exception 'a message cannot be changed once sent' using errcode = '42501';
  end if;

  -- Marking read is one-way; unreading is not a thing.
  if old.read_at is not null and new.read_at is distinct from old.read_at then
    raise exception 'a message cannot be marked unread' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger messages_immutable
  before update on public.messages
  for each row execute function app.enforce_message_immutable();
