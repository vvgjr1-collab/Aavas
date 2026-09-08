-- Only a real counterparty blocks deletion.
--
-- The block written with delete_my_account() asked whether a tenancy was
-- 'active' or 'pending', and stopped there. A pending tenancy is often nobody
-- but you: listing a property creates one before any tenant exists, and a
-- tenant-first claim names a landlord who may never sign up. Both left an
-- account permanently undeletable, protecting a person who was not there.
--
-- The protection is worth keeping and worth narrowing: what must not happen is
-- one party leaving and taking the other party's records with them. So the
-- test is whether somebody else is actually on the tenancy - a landlord and a
-- tenant, or a landlord and at least one member - not merely whether a row
-- exists.

create or replace function public.account_deletion_block()
returns table (reason text, tenancy_id uuid, property_id uuid, is_landlord boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    case
      when t.landlord_id = auth.uid() then 'You are the landlord on a live tenancy.'
      else 'You are the tenant on a live tenancy.'
    end,
    t.id,
    t.property_id,
    t.landlord_id = auth.uid()
  from public.tenancies t
  where auth.uid() is not null
    and t.status in ('active', 'pending')
    -- The caller is on it...
    and (
      t.landlord_id = auth.uid()
      or t.tenant_id = auth.uid()
      or exists (
        select 1 from public.tenancy_members m
        where m.tenancy_id = t.id and m.tenant_id = auth.uid()
      )
    )
    -- ...and so is somebody else.
    and t.landlord_id is not null
    and (
      (t.tenant_id is not null and t.tenant_id <> t.landlord_id)
      or exists (
        select 1 from public.tenancy_members m
        where m.tenancy_id = t.id and m.tenant_id <> t.landlord_id
      )
    )
  limit 1;
$$;

comment on function public.account_deletion_block() is
  'Why this account cannot be deleted, or no rows when it can. Only a tenancy '
  'with two real parties blocks: an empty listing protects nobody.';
