-- Deleting your own account.
--
-- The privacy policy has said "not yet self-service - ask, and it will be done
-- by hand" since it was written. This is the hand.
--
-- It refuses while a live tenancy exists, on either side, and that refusal is
-- the point rather than an inconvenience. Everything hangs off profiles by
-- cascade, so a landlord deleting themselves mid-tenancy would take the
-- property, the lease, the payment history and the conversation with it - out
-- from under a tenant who had no say and no warning. A tenancy is an agreement
-- between two people, and one of them cannot end it by closing an account any
-- more than they can by pressing a button. Give notice, agree it, then leave.
--
-- Ended and rejected tenancies do not block: those are finished, and the
-- person is entitled to go.

/**
 * Why this account cannot be deleted yet, or null when it can.
 *
 * Separate from the delete so the screen can explain the situation before
 * anyone types their email into a confirmation box, and point them at the
 * property it concerns.
 */
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
    and (
      t.landlord_id = auth.uid()
      or t.tenant_id = auth.uid()
      or exists (
        select 1 from public.tenancy_members m
        where m.tenancy_id = t.id and m.tenant_id = auth.uid()
      )
    )
  limit 1;
$$;

/**
 * Delete the caller's own account.
 *
 * Removing the auth user cascades to the profile, and the profile cascades to
 * everything else - so this is one statement rather than a list that could
 * fall out of step with the schema.
 *
 * Nothing here takes an id. A function that deleted "a" user would be one
 * mistake away from deleting the wrong one; this can only ever delete whoever
 * is calling it.
 */
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_block text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select reason into v_block from public.account_deletion_block() limit 1;
  if v_block is not null then
    raise exception
      'cannot delete this account while a tenancy is live: %', v_block
      using errcode = '42501';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.account_deletion_block() from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.account_deletion_block() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
