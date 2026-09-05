-- Photos of the property itself.
--
-- Filed under the property they belong to:
--
--     properties/<property_id>/<filename>
--
-- so, as with documents, access is decided from the path alone.
--
-- This bucket is public-read, and the private `documents` bucket is not. The
-- difference is what is in them: a rent agreement names two people and their
-- terms, while a photo of a flat is the thing a listing exists to show. Public
-- read is also what makes a photo usable as an <img src> on a card without a
-- signed URL that expires mid-scroll. Paths carry a uuid and a random
-- filename, so they are not enumerable, but they are not secret either -
-- anyone given the URL can open it. Nothing that identifies a person should be
-- uploaded here, which is why documents keep their own private bucket.
--
-- Writing is another matter entirely: only the landlord who owns the property
-- may add, replace or remove a photo under its folder.

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do update set public = true;

/**
 * True when the caller owns the property named in the path.
 *
 * Anything that is not a well-formed property path is refused rather than
 * allowed - a malformed path must never fall through to permitted.
 */
create or replace function app.owns_property_path(p_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_segment  text;
  v_property uuid;
begin
  if p_path is null or split_part(p_path, '/', 1) <> 'properties' then
    return false;
  end if;

  v_segment := split_part(p_path, '/', 2);
  if v_segment = '' then
    return false;
  end if;

  begin
    v_property := v_segment::uuid;
  exception when others then
    return false;
  end;

  -- A file directly under the folder root is not addressed by this scheme.
  if split_part(p_path, '/', 3) = '' then
    return false;
  end if;

  return app.owns_property(v_property);
end;
$$;

revoke all on function app.owns_property_path(text) from public, anon;
grant execute on function app.owns_property_path(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Bucket policies
--
-- Reads need no policy: the bucket is public, which storage handles itself.
-- These cover the writes, which are not public at all.
-- ---------------------------------------------------------------------------

create policy property_photos_insert_owner on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property-photos' and app.owns_property_path(name));

create policy property_photos_update_owner on storage.objects
  for update to authenticated
  using (bucket_id = 'property-photos' and app.owns_property_path(name))
  with check (bucket_id = 'property-photos' and app.owns_property_path(name));

create policy property_photos_delete_owner on storage.objects
  for delete to authenticated
  using (bucket_id = 'property-photos' and app.owns_property_path(name));
