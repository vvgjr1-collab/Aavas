-- Let a pending tenancy be withdrawn by whoever opened it.
--
-- tenancies was granted select, insert and update but never delete, so a
-- tenant who mistyped their address created a claim that could not be removed
-- and could then create another, and another. Found by a test run whose
-- cleanup reported success while deleting nothing: PostgREST answers a delete
-- with no privilege by matching no rows, not by failing.
--
-- Only pending, unconfirmed rows can go. Once a tenancy is active it is a
-- record of a real agreement between two people, and one of them must not be
-- able to erase it unilaterally - ending a tenancy is a status change, not a
-- deletion.

grant delete on public.tenancies to authenticated;

create policy tenancies_delete_own_pending on public.tenancies
  for delete to authenticated
  using (
    status = 'pending'
    and confirmed_at is null
    and (created_by = auth.uid() or landlord_id = auth.uid())
  );
