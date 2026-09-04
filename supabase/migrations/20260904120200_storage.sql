-- Private storage for rent agreements, receipts and photos.
--
-- Every object is filed under the tenancy it belongs to:
--
--     tenancies/<tenancy_id>/<kind>/<filename>
--
-- so access can be decided from the path alone, with no lookup into
-- public.documents. The real authorisation is app.can_access_document_path(),
-- which is unit-tested; the policies below are one line of glue each.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Returns true when the caller is a party to the tenancy named in the path.
-- Anything that is not a well-formed tenancy path is refused rather than
-- allowed: a malformed path must never fall through to permitted.
create or replace function app.can_access_document_path(p_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_segment text;
  v_tenancy uuid;
begin
  if p_path is null or split_part(p_path, '/', 1) <> 'tenancies' then
    return false;
  end if;

  v_segment := split_part(p_path, '/', 2);
  if v_segment = '' then
    return false;
  end if;

  -- split_part gives text; a junk segment must not raise, just refuse.
  begin
    v_tenancy := v_segment::uuid;
  exception when others then
    return false;
  end;

  -- A file directly under the tenancy folder is not addressed by this scheme.
  if split_part(p_path, '/', 3) = '' then
    return false;
  end if;

  return app.is_tenancy_party(v_tenancy);
end;
$$;

revoke all on function app.can_access_document_path(text) from public, anon;
grant execute on function app.can_access_document_path(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Bucket policies
-- ---------------------------------------------------------------------------

create policy documents_read_party on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and app.can_access_document_path(name));

create policy documents_write_party on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and app.can_access_document_path(name));

create policy documents_update_party on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and app.can_access_document_path(name))
  with check (bucket_id = 'documents' and app.can_access_document_path(name));

create policy documents_delete_owner on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and app.can_access_document_path(name)
    and owner = auth.uid()
  );
