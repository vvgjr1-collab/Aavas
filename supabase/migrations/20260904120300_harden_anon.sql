-- Take anon's table privileges away entirely.
--
-- Supabase grants every new object in `public` to anon and authenticated
-- through default privileges. So even with no policy written for them, an
-- anonymous caller could still *execute* a select against every table - the
-- request succeeded and returned an empty array because RLS filtered it, not
-- because the door was shut. Verified against the live project: every table
-- answered anon with "HTTP 200, empty" rather than a permission error.
--
-- That leaves RLS as a single point of failure. One `for select using (true)`
-- written by mistake, or a policy that accidentally matches when auth.uid() is
-- null, and the data is public. Removing the privilege puts a second, blunter
-- lock in front of it: with no SELECT granted, no policy can let anon through.
--
-- Nothing in the app needs anonymous table access. Sign-up and sign-in go
-- through GoTrue at /auth/v1, not PostgREST, and guest login is a purely local
-- demo path that never reaches the database.

-- Existing objects.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- Objects added later, or this comes straight back the next time a table is
-- created. These mirror the grants Supabase installs by default.
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- USAGE stays: without it PostgREST cannot resolve the schema and returns a
-- confusing error instead of a clean "permission denied".
grant usage on schema public to anon;
