-- Row Level Security.
--
-- GitHub Pages serves the bundle publicly, so the Supabase anon key is public
-- by design. That makes these policies the entire security model: if one is
-- wrong, anyone on the internet can read every rent agreement in the database.
-- supabase/tests/rls.test.mjs proves each of them against real Postgres.
--
-- Two rules run through everything here:
--   1. Authorisation comes from relationships, never from profiles.active_role.
--      Role is a UI mode the user can switch at will; it must not grant access.
--   2. The landlord's figures win. The rent agreement is what both sides sign,
--      and the landlord is the party who confirms it, so only the landlord can
--      write the authoritative money and date columns on a tenancy.

-- ---------------------------------------------------------------------------
-- Membership helpers
--
-- SECURITY DEFINER on purpose. A policy on payments that reads tenancies would
-- otherwise re-enter the tenancies policy on every row; worse, a policy on
-- tenancies that reads tenancies recurses outright. Running as the owner reads
-- the base tables directly. search_path is pinned so a caller cannot shadow
-- `public` with their own objects.
-- ---------------------------------------------------------------------------

create or replace function app.is_tenancy_party(p_tenancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.tenancies t
    where t.id = p_tenancy_id
      and auth.uid() is not null
      and (t.tenant_id = auth.uid() or t.landlord_id = auth.uid())
  );
$$;

create or replace function app.is_tenancy_landlord(p_tenancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.tenancies t
    where t.id = p_tenancy_id
      and auth.uid() is not null
      and t.landlord_id = auth.uid()
  );
$$;

create or replace function app.is_tenancy_tenant(p_tenancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.tenancies t
    where t.id = p_tenancy_id
      and auth.uid() is not null
      and t.tenant_id = auth.uid()
  );
$$;

create or replace function app.owns_property(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.properties p
    where p.id = p_property_id
      and auth.uid() is not null
      and p.landlord_id = auth.uid()
  );
$$;

-- The counterparty's name and phone have to be readable, or "Contact your
-- landlord" has nothing to show. Sharing a tenancy is the only thing that
-- opens up another person's profile.
create or replace function app.shares_tenancy_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.tenancies t
    where auth.uid() is not null
      and (
        (t.tenant_id = auth.uid()   and t.landlord_id = p_other) or
        (t.landlord_id = auth.uid() and t.tenant_id   = p_other)
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- The landlord's figures win
--
-- Row Level Security is row-level, not column-level, so a plain "tenant may
-- update their tenancy" policy would also let them rewrite the rent. This
-- trigger draws the column boundary instead: a tenant may correct what they
-- proposed, and nothing else.
-- ---------------------------------------------------------------------------

create or replace function app.enforce_tenancy_authority()
returns trigger
language plpgsql
-- SECURITY INVOKER deliberately. This function reads nothing but OLD and NEW,
-- so it needs no elevated rights - and as DEFINER, current_user would always
-- be the owner, which would make the check below pass for everyone and turn
-- the whole trigger into a no-op.
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Only direct writes from the API are policed. Inside the SECURITY DEFINER
  -- functions below, current_user is the function owner rather than
  -- 'authenticated', which is what lets redeem_invite() and confirm_tenancy()
  -- attach a tenant and set the agreed terms - operations the caller is not
  -- allowed to perform by hand. service_role is trusted for the same reason.
  if current_user <> 'authenticated' then
    return new;
  end if;

  if v_uid is null or v_uid = old.landlord_id then
    return new;
  end if;

  if v_uid = old.tenant_id or v_uid = old.created_by then
    if new.rent is distinct from old.rent
       or new.deposit is distinct from old.deposit
       or new.start_date is distinct from old.start_date
       or new.end_date is distinct from old.end_date
       or new.status is distinct from old.status
       or new.confirmed_at is distinct from old.confirmed_at
       or new.confirmed_by is distinct from old.confirmed_by
       or new.landlord_id is distinct from old.landlord_id
       or new.property_id is distinct from old.property_id
       or new.tenant_id is distinct from old.tenant_id
    then
      raise exception
        'only the landlord can change the agreed terms of a tenancy'
        using errcode = '42501';
    end if;
    return new;
  end if;

  raise exception 'not a party to this tenancy' using errcode = '42501';
end;
$$;

create trigger tenancies_enforce_authority
  before update on public.tenancies
  for each row execute function app.enforce_tenancy_authority();

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.properties       enable row level security;
alter table public.tenancies        enable row level security;
alter table public.invites          enable row level security;
alter table public.documents        enable row level security;
alter table public.payments         enable row level security;
alter table public.complaints       enable row level security;
alter table public.service_bookings enable row level security;

-- ---------------------------------------------------------------------------
-- Grants. RLS only narrows what a privilege already allows, so anon gets
-- nothing at all and every table starts from an explicit grant.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

-- The membership helpers are called from policies and, for the storage path
-- check, directly by the client. anon is deliberately left out: with no USAGE
-- on this schema it cannot reach any of them. Each helper answers only about
-- the caller's own relationships, so this exposes nothing on its own. Note
-- that app is not a PostgREST-exposed schema, so none of it is callable over
-- the API regardless.
grant usage on schema app to authenticated;

grant select, insert, update            on public.profiles         to authenticated;
grant select, insert, update, delete    on public.properties       to authenticated;
grant select, insert, update            on public.tenancies        to authenticated;
grant select, insert, update, delete    on public.invites          to authenticated;
grant select, insert, delete            on public.documents        to authenticated;
grant select, insert, update, delete    on public.payments         to authenticated;
grant select, insert, update            on public.complaints       to authenticated;
grant select, insert, update, delete    on public.service_bookings to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy profiles_select_self_or_counterparty on public.profiles
  for select to authenticated
  using (id = auth.uid() or app.shares_tenancy_with(id));

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- properties
--
-- A tenant can see the property they rent, and nothing else in the portfolio.
-- ---------------------------------------------------------------------------

create policy properties_select_landlord_or_tenant on public.properties
  for select to authenticated
  using (
    landlord_id = auth.uid()
    or exists (
      select 1 from public.tenancies t
      where t.property_id = properties.id
        and t.tenant_id = auth.uid()
        and t.status in ('active', 'ended')
    )
  );

create policy properties_insert_own on public.properties
  for insert to authenticated
  with check (landlord_id = auth.uid());

create policy properties_update_own on public.properties
  for update to authenticated
  using (landlord_id = auth.uid())
  with check (landlord_id = auth.uid());

create policy properties_delete_own on public.properties
  for delete to authenticated
  using (landlord_id = auth.uid());

-- ---------------------------------------------------------------------------
-- tenancies
--
-- Written against the row's own columns rather than a helper, so there is no
-- recursion to worry about here.
-- ---------------------------------------------------------------------------

create policy tenancies_select_party on public.tenancies
  for select to authenticated
  using (tenant_id = auth.uid() or landlord_id = auth.uid() or created_by = auth.uid());

-- Either side may open a tenancy: a landlord against a property they own, or a
-- tenant declaring the place they already live in. A tenant-declared row must
-- start pending, with no landlord attached and no self-granted terms.
create policy tenancies_insert_landlord on public.tenancies
  for insert to authenticated
  with check (
    source = 'landlord'
    and created_by = auth.uid()
    and landlord_id = auth.uid()
    and app.owns_property(property_id)
  );

create policy tenancies_insert_tenant_claim on public.tenancies
  for insert to authenticated
  with check (
    source = 'tenant'
    and created_by = auth.uid()
    and tenant_id = auth.uid()
    and landlord_id is null
    and status = 'pending'
    and confirmed_at is null
    and rent = 0
    and deposit = 0
  );

-- The column boundary is drawn by app.enforce_tenancy_authority(), not here.
create policy tenancies_update_party on public.tenancies
  for update to authenticated
  using (landlord_id = auth.uid() or tenant_id = auth.uid() or created_by = auth.uid())
  with check (landlord_id = auth.uid() or tenant_id = auth.uid() or created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- invites
--
-- Only the landlord side ever reads these. A tenant never selects an invite by
-- code - that is what redeem_invite() is for - because being able to query the
-- table by code is being able to guess codes.
-- ---------------------------------------------------------------------------

create policy invites_select_landlord on public.invites
  for select to authenticated
  using (app.is_tenancy_landlord(tenancy_id));

create policy invites_insert_landlord on public.invites
  for insert to authenticated
  with check (created_by = auth.uid() and app.is_tenancy_landlord(tenancy_id));

create policy invites_update_landlord on public.invites
  for update to authenticated
  using (app.is_tenancy_landlord(tenancy_id))
  with check (app.is_tenancy_landlord(tenancy_id));

create policy invites_delete_landlord on public.invites
  for delete to authenticated
  using (app.is_tenancy_landlord(tenancy_id));

-- ---------------------------------------------------------------------------
-- documents
--
-- The rent agreement lives here. Both parties read it; neither can reach into
-- another tenancy's files.
-- ---------------------------------------------------------------------------

create policy documents_select_party on public.documents
  for select to authenticated
  using (app.is_tenancy_party(tenancy_id));

create policy documents_insert_party on public.documents
  for insert to authenticated
  with check (uploaded_by = auth.uid() and app.is_tenancy_party(tenancy_id));

-- Delete your own upload; a landlord can also clear anything on their tenancy.
create policy documents_delete_uploader_or_landlord on public.documents
  for delete to authenticated
  using (uploaded_by = auth.uid() or app.is_tenancy_landlord(tenancy_id));

-- ---------------------------------------------------------------------------
-- payments
--
-- A tenant records what they paid; only the landlord confirms receipt, so only
-- the landlord can edit a row after the fact.
-- ---------------------------------------------------------------------------

create policy payments_select_party on public.payments
  for select to authenticated
  using (app.is_tenancy_party(tenancy_id));

create policy payments_insert_party on public.payments
  for insert to authenticated
  with check (
    recorded_by = auth.uid()
    and app.is_tenancy_party(tenancy_id)
    -- A tenant may report a payment; marking it received is the landlord's.
    and (app.is_tenancy_landlord(tenancy_id) or status <> 'paid')
  );

create policy payments_update_landlord on public.payments
  for update to authenticated
  using (app.is_tenancy_landlord(tenancy_id))
  with check (app.is_tenancy_landlord(tenancy_id));

create policy payments_delete_landlord on public.payments
  for delete to authenticated
  using (app.is_tenancy_landlord(tenancy_id));

-- ---------------------------------------------------------------------------
-- complaints
-- ---------------------------------------------------------------------------

create policy complaints_select_party on public.complaints
  for select to authenticated
  using (app.is_tenancy_party(tenancy_id));

create policy complaints_insert_party on public.complaints
  for insert to authenticated
  with check (created_by = auth.uid() and app.is_tenancy_party(tenancy_id));

-- The tenant edits the description, the landlord moves it through its states.
create policy complaints_update_party on public.complaints
  for update to authenticated
  using (app.is_tenancy_party(tenancy_id))
  with check (app.is_tenancy_party(tenancy_id));

-- ---------------------------------------------------------------------------
-- service_bookings
-- ---------------------------------------------------------------------------

create policy bookings_select_party on public.service_bookings
  for select to authenticated
  using (app.is_tenancy_party(tenancy_id));

create policy bookings_insert_party on public.service_bookings
  for insert to authenticated
  with check (created_by = auth.uid() and app.is_tenancy_party(tenancy_id));

create policy bookings_update_party on public.service_bookings
  for update to authenticated
  using (app.is_tenancy_party(tenancy_id))
  with check (app.is_tenancy_party(tenancy_id));

create policy bookings_delete_creator on public.service_bookings
  for delete to authenticated
  using (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Onboarding entry points
--
-- These are SECURITY DEFINER because each one has to see or touch a row the
-- caller cannot select. They are the only sanctioned way across those lines,
-- and each re-checks the caller itself.
-- ---------------------------------------------------------------------------

-- Landlord-first path. The tenant never queries the invites table; they hand
-- over a code and get back a tenancy or an error.
create or replace function public.redeem_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_invite  public.invites;
  v_tenancy public.tenancies;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_invite from public.invites where code = p_code;
  if not found then
    raise exception 'invite not found' using errcode = '22023';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'invite has already been used' using errcode = '22023';
  end if;
  if v_invite.expires_at <= now() then
    raise exception 'invite has expired' using errcode = '22023';
  end if;

  select * into v_tenancy from public.tenancies where id = v_invite.tenancy_id;
  if v_tenancy.landlord_id = v_uid then
    raise exception 'you cannot be the tenant of your own property'
      using errcode = '22023';
  end if;
  if v_tenancy.tenant_id is not null and v_tenancy.tenant_id <> v_uid then
    raise exception 'this tenancy already has a tenant' using errcode = '22023';
  end if;

  -- The landlord set the terms and issued the invite; accepting it is assent,
  -- so the tenancy goes straight to active on the landlord's figures.
  update public.tenancies
     set tenant_id    = v_uid,
         status       = 'active',
         confirmed_at = coalesce(confirmed_at, now()),
         confirmed_by = coalesce(confirmed_by, landlord_id)
   where id = v_tenancy.id;

  update public.invites
     set accepted_at = now(),
         accepted_by = v_uid
   where id = v_invite.id;

  return v_tenancy.id;
end;
$$;

-- Tenant-first path, landlord side: what is waiting for me to claim?
-- Matched on the email the tenant typed, which is why it needs elevated rights.
create or replace function public.pending_claims_for_me()
returns setof public.tenancies
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select t.*
  from public.tenancies t
  join public.profiles me on me.id = auth.uid()
  where auth.uid() is not null
    and t.source = 'tenant'
    and t.status = 'pending'
    and t.landlord_id is null
    and t.claimed_landlord_email is not null
    and lower(t.claimed_landlord_email) = lower(me.email);
$$;

-- Tenant-first path, landlord side: claim it and set the real terms.
-- This function is where "the landlord's number wins" actually happens - the
-- tenant's proposed_* values are kept for the record, and the figures passed
-- here become the agreed ones.
create or replace function public.confirm_tenancy(
  p_tenancy_id  uuid,
  p_property_id uuid,
  p_rent        numeric,
  p_deposit     numeric,
  p_start_date  date,
  p_end_date    date
)
returns public.tenancies
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_tenancy public.tenancies;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not app.owns_property(p_property_id) then
    raise exception 'you do not own that property' using errcode = '42501';
  end if;

  select * into v_tenancy from public.tenancies where id = p_tenancy_id;
  if not found then
    raise exception 'tenancy not found' using errcode = '22023';
  end if;
  if v_tenancy.status <> 'pending' then
    raise exception 'tenancy is not pending confirmation' using errcode = '22023';
  end if;
  if v_tenancy.landlord_id is not null and v_tenancy.landlord_id <> v_uid then
    raise exception 'tenancy belongs to another landlord' using errcode = '42501';
  end if;
  if v_tenancy.tenant_id is null then
    raise exception 'tenancy has no tenant to confirm' using errcode = '22023';
  end if;
  if v_tenancy.tenant_id = v_uid then
    raise exception 'you cannot be both parties to a tenancy' using errcode = '22023';
  end if;

  update public.tenancies
     set property_id  = p_property_id,
         landlord_id  = v_uid,
         rent         = p_rent,
         deposit      = p_deposit,
         start_date   = p_start_date,
         end_date     = p_end_date,
         status       = 'active',
         confirmed_at = now(),
         confirmed_by = v_uid
   where id = p_tenancy_id
   returning * into v_tenancy;

  update public.properties
     set status = 'occupied'
   where id = p_property_id;

  return v_tenancy;
end;
$$;

-- Landlord disputes the claim. Kept rather than deleted so the tenant sees
-- what happened instead of the row silently vanishing.
create or replace function public.reject_tenancy_claim(p_tenancy_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_ok  boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.tenancies t
    join public.profiles me on me.id = v_uid
    where t.id = p_tenancy_id
      and t.status = 'pending'
      and (
        t.landlord_id = v_uid
        or (t.landlord_id is null
            and lower(t.claimed_landlord_email) = lower(me.email))
      )
  ) into v_ok;

  if not v_ok then
    raise exception 'not your claim to reject' using errcode = '42501';
  end if;

  update public.tenancies set status = 'rejected' where id = p_tenancy_id;
end;
$$;

-- Only signed-in users may call these.
revoke all on function public.redeem_invite(text)          from public, anon;
revoke all on function public.pending_claims_for_me()      from public, anon;
revoke all on function public.confirm_tenancy(uuid, uuid, numeric, numeric, date, date)
  from public, anon;
revoke all on function public.reject_tenancy_claim(uuid)   from public, anon;

grant execute on function public.redeem_invite(text)          to authenticated;
grant execute on function public.pending_claims_for_me()      to authenticated;
grant execute on function public.confirm_tenancy(uuid, uuid, numeric, numeric, date, date)
  to authenticated;
grant execute on function public.reject_tenancy_claim(uuid)   to authenticated;
