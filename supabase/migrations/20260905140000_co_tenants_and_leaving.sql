-- Co-tenants, and leaving a tenancy with the landlord's approval.
--
-- Two flatmates on one lease are one tenancy with two people on it, not two
-- tenancies: they share an address, a rent and an agreement, and duplicating
-- the tenancy would duplicate all three and leave nothing saying they are the
-- same let. So membership moves into its own table.
--
-- tenancies.tenant_id stays as the first tenant - the one who redeemed the
-- invite - because confirm_tenancy and the "an active tenancy has a tenant"
-- constraint are written in terms of it. It is now shorthand for "a member",
-- and every policy checks the membership table as well.

-- ---------------------------------------------------------------------------
-- Membership
-- ---------------------------------------------------------------------------

create table public.tenancy_members (
  tenancy_id uuid not null references public.tenancies (id) on delete cascade,
  tenant_id  uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (tenancy_id, tenant_id)
);

create index tenancy_members_tenant_idx on public.tenancy_members (tenant_id);

-- Everyone already attached becomes a member, so nothing loses access.
insert into public.tenancy_members (tenancy_id, tenant_id)
select id, tenant_id from public.tenancies where tenant_id is not null
on conflict do nothing;

alter table public.tenancy_members enable row level security;
grant select, delete on public.tenancy_members to authenticated;

-- ---------------------------------------------------------------------------
-- Leaving
-- ---------------------------------------------------------------------------

-- A tenant asks; the landlord agrees. Neither side can end a tenancy alone:
-- the tenant cannot walk out of an agreement in the app's record of it, and
-- the landlord cannot evict someone by pressing a button.
alter table public.tenancies
  add column end_requested_at timestamptz,
  add column end_requested_by uuid references public.profiles (id) on delete set null,
  add column ended_at         timestamptz;

-- The original constraint tied confirmed_at to status being exactly 'active',
-- which makes ending a tenancy impossible: the row was confirmed, and still
-- is - it is simply over. An ended tenancy is a confirmed one.
alter table public.tenancies drop constraint tenancy_confirmed_fields;
alter table public.tenancies add constraint tenancy_confirmed_fields
  check ((status in ('active', 'ended')) = (confirmed_at is not null));

-- ---------------------------------------------------------------------------
-- Membership-aware helpers
-- ---------------------------------------------------------------------------

create or replace function app.is_tenancy_member(p_tenancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1 from public.tenancy_members m
    where m.tenancy_id = p_tenancy_id and m.tenant_id = auth.uid()
  );
$$;

create or replace function app.is_tenancy_party(p_tenancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.tenancies t
      where t.id = p_tenancy_id
        and (t.tenant_id = auth.uid() or t.landlord_id = auth.uid())
    )
    or exists (
      select 1 from public.tenancy_members m
      where m.tenancy_id = p_tenancy_id and m.tenant_id = auth.uid()
    )
  );
$$;

create or replace function app.is_tenancy_tenant(p_tenancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.tenancies t
      where t.id = p_tenancy_id and t.tenant_id = auth.uid()
    )
    or exists (
      select 1 from public.tenancy_members m
      where m.tenancy_id = p_tenancy_id and m.tenant_id = auth.uid()
    )
  );
$$;

-- A co-tenant must be able to read their landlord, and the landlord must be
-- able to read every co-tenant - otherwise the second flatmate has no contact
-- details and does not appear on the property.
create or replace function app.shares_tenancy_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.tenancies t
      where (t.tenant_id = auth.uid()   and t.landlord_id = p_other)
         or (t.landlord_id = auth.uid() and t.tenant_id   = p_other)
    )
    or exists (
      select 1
      from public.tenancy_members me
      join public.tenancies t on t.id = me.tenancy_id
      where me.tenant_id = auth.uid()
        and (t.landlord_id = p_other
             or exists (select 1 from public.tenancy_members o
                        where o.tenancy_id = t.id and o.tenant_id = p_other))
    )
    or exists (
      select 1
      from public.tenancies t
      join public.tenancy_members o on o.tenancy_id = t.id
      where t.landlord_id = auth.uid() and o.tenant_id = p_other
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Membership policies
-- ---------------------------------------------------------------------------

create policy tenancy_members_select_party on public.tenancy_members
  for select to authenticated
  using (app.is_tenancy_party(tenancy_id));

-- Leaving before the tenancy is confirmed is just undoing a join. Leaving an
-- active one is the request/approve flow below, not a delete.
create policy tenancy_members_delete_self_pending on public.tenancy_members
  for delete to authenticated
  using (
    tenant_id = auth.uid()
    and exists (
      select 1 from public.tenancies t
      where t.id = tenancy_id and t.status = 'pending'
    )
  );

-- ---------------------------------------------------------------------------
-- Tenancy policies, widened to members
-- ---------------------------------------------------------------------------

drop policy if exists tenancies_select_party on public.tenancies;
create policy tenancies_select_party on public.tenancies
  for select to authenticated
  using (
    tenant_id = auth.uid()
    or landlord_id = auth.uid()
    or created_by = auth.uid()
    or app.is_tenancy_member(id)
  );

drop policy if exists tenancies_update_party on public.tenancies;
create policy tenancies_update_party on public.tenancies
  for update to authenticated
  using (
    landlord_id = auth.uid() or tenant_id = auth.uid() or created_by = auth.uid()
    or app.is_tenancy_member(id)
  )
  with check (
    landlord_id = auth.uid() or tenant_id = auth.uid() or created_by = auth.uid()
    or app.is_tenancy_member(id)
  );

-- Properties: a co-tenant sees the property they live in, same as the first.
drop policy if exists properties_select_landlord_or_tenant on public.properties;
create policy properties_select_landlord_or_tenant on public.properties
  for select to authenticated
  using (
    landlord_id = auth.uid()
    or exists (
      select 1 from public.tenancies t
      where t.property_id = properties.id
        and t.status in ('active', 'ended')
        and (t.tenant_id = auth.uid() or app.is_tenancy_member(t.id))
    )
  );

-- ---------------------------------------------------------------------------
-- The authority trigger, updated
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
  v_is_member boolean;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if v_uid is null or v_uid = old.landlord_id then
    return new;
  end if;

  select exists (
    select 1 from public.tenancy_members m
    where m.tenancy_id = old.id and m.tenant_id = v_uid
  ) into v_is_member;

  if v_uid = old.tenant_id or v_uid = old.created_by or v_is_member then
    -- A tenant may ask to end the tenancy; only the landlord may act on it.
    -- end_requested_at and end_requested_by are therefore writable here, and
    -- status, ended_at and the agreed terms are not.
    if new.rent is distinct from old.rent
       or new.deposit is distinct from old.deposit
       or new.start_date is distinct from old.start_date
       or new.end_date is distinct from old.end_date
       or new.status is distinct from old.status
       or new.ended_at is distinct from old.ended_at
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

-- ---------------------------------------------------------------------------
-- redeem_invite: a code now adds a member rather than refusing a second one
-- ---------------------------------------------------------------------------

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
  if exists (
    select 1 from public.tenancy_members m
    where m.tenancy_id = v_tenancy.id and m.tenant_id = v_uid
  ) then
    raise exception 'you have already joined this tenancy' using errcode = '22023';
  end if;

  -- Flatmates share one lease, so a second code joins the same tenancy rather
  -- than being turned away. The first tenant stays in tenancies.tenant_id.
  insert into public.tenancy_members (tenancy_id, tenant_id)
  values (v_tenancy.id, v_uid)
  on conflict do nothing;

  update public.tenancies
     set tenant_id    = coalesce(tenant_id, v_uid),
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

-- confirm_tenancy also records the tenant as a member.
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

  insert into public.tenancy_members (tenancy_id, tenant_id)
  values (v_tenancy.id, v_tenancy.tenant_id)
  on conflict do nothing;

  update public.properties set status = 'occupied' where id = p_property_id;

  return v_tenancy;
end;
$$;

-- ---------------------------------------------------------------------------
-- Leaving: request, approve, withdraw
-- ---------------------------------------------------------------------------

/** A tenant asks to end the tenancy. Nothing changes until the landlord agrees. */
create or replace function public.request_end_tenancy(p_tenancy_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not app.is_tenancy_tenant(p_tenancy_id) then
    raise exception 'only a tenant can ask to leave' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.tenancies where id = p_tenancy_id and status = 'active'
  ) then
    raise exception 'only an active tenancy can be ended' using errcode = '22023';
  end if;

  update public.tenancies
     set end_requested_at = coalesce(end_requested_at, now()),
         end_requested_by = coalesce(end_requested_by, v_uid)
   where id = p_tenancy_id;
end;
$$;

/** The tenant changes their mind before the landlord has acted. */
create or replace function public.cancel_end_request(p_tenancy_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not app.is_tenancy_tenant(p_tenancy_id) then
    raise exception 'not your request to cancel' using errcode = '42501';
  end if;
  update public.tenancies
     set end_requested_at = null, end_requested_by = null
   where id = p_tenancy_id and status = 'active';
end;
$$;

/**
 * The landlord agrees, and the tenancy ends.
 *
 * Ending is a status change, not a deletion: the payments, complaints and
 * documents attached to it are the record of a real let and outlive it. The
 * property goes back to vacant so it can be let again.
 */
create or replace function public.approve_end_tenancy(p_tenancy_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_prop uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not app.is_tenancy_landlord(p_tenancy_id) then
    raise exception 'only the landlord can end a tenancy' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.tenancies
    where id = p_tenancy_id and status = 'active' and end_requested_at is not null
  ) then
    raise exception 'no pending request to leave on this tenancy'
      using errcode = '22023';
  end if;

  update public.tenancies
     set status = 'ended', ended_at = now()
   where id = p_tenancy_id
   returning property_id into v_prop;

  if v_prop is not null then
    update public.properties set status = 'vacant' where id = v_prop;
  end if;
end;
$$;

revoke all on function public.request_end_tenancy(uuid) from public, anon;
revoke all on function public.cancel_end_request(uuid)  from public, anon;
revoke all on function public.approve_end_tenancy(uuid) from public, anon;
grant execute on function public.request_end_tenancy(uuid) to authenticated;
grant execute on function public.cancel_end_request(uuid)  to authenticated;
grant execute on function public.approve_end_tenancy(uuid) to authenticated;

-- The new table is covered by the same revoke as everything else in public.
revoke all on public.tenancy_members from anon;
