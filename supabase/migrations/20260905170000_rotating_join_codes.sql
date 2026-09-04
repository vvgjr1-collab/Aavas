-- Rotating join codes, on the property.
--
-- Two problems with the single-use invite:
--
--   1. It was minted against a tenancy, and a property added through the
--      listing wizard has no tenancy - so a landlord with a new property had
--      nowhere to find a code at all. Codes belong to the property, which
--      exists from the moment it is listed.
--
--   2. It was consumed by the first person to use it, which is the wrong shape
--      for flatmates: two bachelors moving into one flat both need to join,
--      and the landlord should not have to mint a code each time.
--
-- So the code works like an authenticator: always visible to the landlord,
-- valid for a window, rotating when that window closes, and usable by anyone
-- who has it while it lasts. Being short-lived is what stops it becoming a
-- permanent password to someone's home - a static shared code would be exactly
-- that.
--
-- The old invites table stays. It is still the right thing for "email this
-- specific person a one-time link", and redeem_invite() accepts either kind,
-- so nothing that already works stops working.

create table public.property_join_codes (
  property_id      uuid primary key references public.properties (id) on delete cascade,
  code             text not null unique,
  issued_at        timestamptz not null default now(),
  expires_at       timestamptz not null,
  -- 15 minutes: long enough to read it out or send it, short enough that a
  -- screenshot in a group chat is not a standing invitation.
  rotation_seconds integer not null default 900 check (rotation_seconds between 60 and 86400)
);

alter table public.property_join_codes enable row level security;
grant select on public.property_join_codes to authenticated;
revoke all on public.property_join_codes from anon;

-- Only the owner may look at a code. A tenant never reads this table; they
-- hand a code to redeem_invite() and get a tenancy or an error, so the table
-- cannot be enumerated to guess one.
create policy property_join_codes_select_owner on public.property_join_codes
  for select to authenticated
  using (app.owns_property(property_id));

-- Unambiguous alphabet: these get read aloud and retyped.
create or replace function app.new_join_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out text := '';
begin
  for i in 1..8 loop
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return substr(out, 1, 4) || '-' || substr(out, 5, 4);
end;
$$;

/**
 * The code to show the landlord right now, rotating it if the window has
 * closed. Returns the expiry too, so the screen can count down rather than
 * leaving someone guessing whether what they are looking at still works.
 */
create or replace function public.current_join_code(p_property_id uuid)
returns table (code text, expires_at timestamptz, rotation_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.property_join_codes;
begin
  if not app.owns_property(p_property_id) then
    raise exception 'not your property' using errcode = '42501';
  end if;

  select * into v_row from public.property_join_codes where property_id = p_property_id;

  if not found then
    insert into public.property_join_codes (property_id, code, expires_at)
    values (p_property_id, app.new_join_code(), now() + interval '900 seconds')
    returning * into v_row;
  elsif v_row.expires_at <= now() then
    update public.property_join_codes
       set code = app.new_join_code(),
           issued_at = now(),
           expires_at = now() + make_interval(secs => v_row.rotation_seconds)
     where property_id = p_property_id
     returning * into v_row;
  end if;

  return query select v_row.code, v_row.expires_at, v_row.rotation_seconds;
end;
$$;

/** Retire the current code immediately - if it has gone somewhere it should not. */
create or replace function public.rotate_join_code(p_property_id uuid)
returns table (code text, expires_at timestamptz, rotation_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.property_join_codes;
begin
  if not app.owns_property(p_property_id) then
    raise exception 'not your property' using errcode = '42501';
  end if;

  insert into public.property_join_codes (property_id, code, expires_at)
  values (p_property_id, app.new_join_code(), now() + interval '900 seconds')
  on conflict (property_id) do update
    set code = app.new_join_code(),
        issued_at = now(),
        expires_at = now() + make_interval(secs => public.property_join_codes.rotation_seconds)
  returning * into v_row;

  return query select v_row.code, v_row.expires_at, v_row.rotation_seconds;
end;
$$;

-- ---------------------------------------------------------------------------
-- Redeeming
-- ---------------------------------------------------------------------------

/**
 * Join by code.
 *
 * Accepts either kind: a one-time invite addressed to a person, or the
 * property's current rotating code. One entry point, so the tenant screen does
 * not have to know which it was given.
 *
 * A rotating code creates the tenancy if the property has none yet - a
 * property listed through the wizard has terms but no lease - and otherwise
 * adds the caller to the one that exists. That is what makes two flatmates
 * land on the same lease.
 */
create or replace function public.redeem_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_invite   public.invites;
  v_tenancy  public.tenancies;
  v_join     public.property_join_codes;
  v_property public.properties;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_invite from public.invites where code = p_code;

  if found then
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

    insert into public.tenancy_members (tenancy_id, tenant_id)
    values (v_tenancy.id, v_uid) on conflict do nothing;

    update public.tenancies
       set tenant_id    = coalesce(tenant_id, v_uid),
           status       = 'active',
           confirmed_at = coalesce(confirmed_at, now()),
           confirmed_by = coalesce(confirmed_by, landlord_id)
     where id = v_tenancy.id;

    update public.invites
       set accepted_at = now(), accepted_by = v_uid
     where id = v_invite.id;

    return v_tenancy.id;
  end if;

  -- Not an invite: try the rotating property code.
  select * into v_join from public.property_join_codes where code = p_code;
  if not found then
    raise exception 'invite not found' using errcode = '22023';
  end if;
  if v_join.expires_at <= now() then
    raise exception 'that code has expired - ask for the current one'
      using errcode = '22023';
  end if;

  select * into v_property from public.properties where id = v_join.property_id;
  if v_property.landlord_id = v_uid then
    raise exception 'you cannot be the tenant of your own property'
      using errcode = '22023';
  end if;

  select * into v_tenancy
  from public.tenancies
  where property_id = v_property.id and status in ('active', 'pending')
  limit 1;

  if not found then
    -- The property carries the terms until a lease exists, so a first tenant
    -- joins on the landlord's figures rather than on nothing.
    insert into public.tenancies
      (property_id, landlord_id, tenant_id, source, status,
       rent, deposit, created_by, confirmed_at, confirmed_by)
    values
      (v_property.id, v_property.landlord_id, v_uid, 'landlord', 'active',
       v_property.rent, v_property.deposit, v_property.landlord_id, now(),
       v_property.landlord_id)
    returning * into v_tenancy;
  else
    if exists (
      select 1 from public.tenancy_members m
      where m.tenancy_id = v_tenancy.id and m.tenant_id = v_uid
    ) then
      raise exception 'you have already joined this tenancy' using errcode = '22023';
    end if;

    update public.tenancies
       set tenant_id    = coalesce(tenant_id, v_uid),
           status       = 'active',
           confirmed_at = coalesce(confirmed_at, now()),
           confirmed_by = coalesce(confirmed_by, landlord_id)
     where id = v_tenancy.id
     returning * into v_tenancy;
  end if;

  insert into public.tenancy_members (tenancy_id, tenant_id)
  values (v_tenancy.id, v_uid) on conflict do nothing;

  update public.properties set status = 'occupied' where id = v_property.id;

  return v_tenancy.id;
end;
$$;

revoke all on function public.current_join_code(uuid) from public, anon;
revoke all on function public.rotate_join_code(uuid)  from public, anon;
grant execute on function public.current_join_code(uuid) to authenticated;
grant execute on function public.rotate_join_code(uuid)  to authenticated;
