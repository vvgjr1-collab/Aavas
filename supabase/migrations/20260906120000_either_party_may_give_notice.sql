-- Either party may give notice, and say why.
--
-- Leaving was one-directional: a tenant could ask, and the landlord approved.
-- A landlord who needed the property back had no move at all, which is a
-- strange asymmetry in an agreement between two people - and it pushed the
-- conversation off the record, where neither side can point at what was said.
--
-- So notice is now symmetric. Either party may give it, the *other* party
-- approves, and until they do nothing changes. That symmetry is the safeguard:
-- a landlord still cannot evict by button, and a tenant still cannot vanish
-- from the record. This is a record of an agreement, not an instrument of one;
-- it decides nothing legally, it only makes the position explicit to both.
--
-- Notice carries a reason, because "you have 30 days" with no cause is the
-- thing that turns into a dispute. The reasons themselves live in the app,
-- drawn from the agreement's own clauses; the database stores whichever was
-- chosen and whatever was written alongside it.

alter table public.tenancies
  add column end_reason text not null default '',
  add column end_notes  text not null default '';

comment on column public.tenancies.end_reason is
  'Why notice was given - a clause label chosen in the app, free text here.';
comment on column public.tenancies.end_notes is
  'What the party giving notice wrote in their own words.';

-- ---------------------------------------------------------------------------
-- Giving notice
-- ---------------------------------------------------------------------------

-- Replaced rather than overloaded: adding defaulted parameters to the existing
-- function would leave two candidates and make a one-argument call ambiguous.
drop function if exists public.request_end_tenancy(uuid);

/**
 * Give notice on a tenancy.
 *
 * Open to either party. Recording who gave it is what lets the other side be
 * the one who approves - see approve_end_tenancy, which refuses the person who
 * asked.
 */
create or replace function public.request_end_tenancy(
  p_tenancy_id uuid,
  p_reason     text default '',
  p_notes      text default ''
)
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
  -- is_tenancy_member covers flatmates, who are on the lease without being the
  -- single tenant_id; is_tenancy_landlord is the other side of it.
  if not (app.is_tenancy_member(p_tenancy_id) or app.is_tenancy_landlord(p_tenancy_id)) then
    raise exception 'not a party to this tenancy' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.tenancies where id = p_tenancy_id and status = 'active'
  ) then
    raise exception 'only an active tenancy can be ended' using errcode = '22023';
  end if;

  -- coalesce: whoever gave notice first owns it, so a second call from the
  -- other party cannot quietly rewrite the reason or the date.
  update public.tenancies
     set end_requested_at = coalesce(end_requested_at, now()),
         end_requested_by = coalesce(end_requested_by, v_uid),
         end_reason       = case when end_requested_at is null then p_reason else end_reason end,
         end_notes        = case when end_requested_at is null then p_notes  else end_notes  end
   where id = p_tenancy_id;
end;
$$;

/**
 * Agree to notice the other party gave.
 *
 * Refuses the person who gave it: an agreement between two people should not
 * be endable by one of them alone, whichever one they are.
 */
create or replace function public.approve_end_tenancy(p_tenancy_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_row  public.tenancies;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_row from public.tenancies where id = p_tenancy_id;
  if not found or v_row.status <> 'active' or v_row.end_requested_at is null then
    raise exception 'no notice outstanding on this tenancy' using errcode = '22023';
  end if;
  if not (app.is_tenancy_member(p_tenancy_id) or app.is_tenancy_landlord(p_tenancy_id)) then
    raise exception 'not a party to this tenancy' using errcode = '42501';
  end if;
  if v_row.end_requested_by = v_uid then
    raise exception 'the other party has to agree to this' using errcode = '42501';
  end if;

  update public.tenancies
     set status = 'ended', ended_at = now()
   where id = p_tenancy_id;

  update public.properties
     set status = 'vacant'
   where id = v_row.property_id;
end;
$$;

/** Withdraw notice you gave. Only the party who gave it can take it back. */
create or replace function public.cancel_end_request(p_tenancy_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_by  uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select end_requested_by into v_by
  from public.tenancies
  where id = p_tenancy_id and status = 'active' and end_requested_at is not null;

  if v_by is null then
    raise exception 'no notice outstanding on this tenancy' using errcode = '22023';
  end if;
  if v_by <> v_uid then
    raise exception 'only whoever gave notice can withdraw it' using errcode = '42501';
  end if;

  update public.tenancies
     set end_requested_at = null,
         end_requested_by = null,
         end_reason = '',
         end_notes  = ''
   where id = p_tenancy_id;
end;
$$;

revoke all on function public.request_end_tenancy(uuid, text, text) from public, anon;
revoke all on function public.approve_end_tenancy(uuid) from public, anon;
revoke all on function public.cancel_end_request(uuid)  from public, anon;
grant execute on function public.request_end_tenancy(uuid, text, text) to authenticated;
grant execute on function public.approve_end_tenancy(uuid) to authenticated;
grant execute on function public.cancel_end_request(uuid)  to authenticated;
