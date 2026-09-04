/**
 * Runs the migrations against a real Postgres (PGlite is Postgres compiled to
 * WASM, so RLS, roles and policies behave as they do on the server) and gives
 * the tests a way to act as a specific signed-in user.
 *
 * What this stands in for: Supabase provides an `auth` schema, an `auth.uid()`
 * that reads the request JWT, a `storage` schema, and the anon/authenticated
 * roles. Those are recreated below as faithfully as the policies need. Anything
 * beyond that - the API gateway, real JWT verification, storage upload
 * mechanics - is NOT covered here and has to be checked against a real project.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');

/** Mirrors what Supabase provides before any of our migrations run. */
const SUPABASE_PRELUDE = `
  create schema if not exists auth;
  create schema if not exists storage;

  -- Supabase's API roles. NOLOGIN is irrelevant here; what matters is that
  -- they are not the table owner, so RLS applies to them.
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
      create role anon nologin noinherit;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
      create role authenticated nologin noinherit;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then
      create role service_role nologin noinherit bypassrls;
    end if;
  end $$;

  create table if not exists auth.users (
    id                  uuid primary key default gen_random_uuid(),
    email               text unique,
    raw_user_meta_data  jsonb not null default '{}'::jsonb,
    created_at          timestamptz not null default now()
  );

  -- The real implementation reads the verified JWT the API gateway attaches.
  -- Same contract: the caller's id, or null when signed out.
  create or replace function auth.uid()
  returns uuid
  language sql
  stable
  as $$
    select nullif(
      coalesce(
        current_setting('request.jwt.claim.sub', true),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
      ),
      ''
    )::uuid
  $$;

  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;

  -- Minimal storage shim: enough for the bucket policies to compile and for
  -- the path logic to be exercised. Not Supabase's real storage layer.
  create table if not exists storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false
  );
  create table if not exists storage.objects (
    id        uuid primary key default gen_random_uuid(),
    bucket_id text not null references storage.buckets (id),
    name      text not null,
    owner     uuid,
    created_at timestamptz not null default now()
  );
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
  grant select on storage.buckets to anon, authenticated;
`;

export async function createDatabase() {
  const db = new PGlite();
  await db.exec(SUPABASE_PRELUDE);

  const files = (await readdir(MIGRATIONS)).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await readFile(join(MIGRATIONS, file), 'utf8');
    try {
      await db.exec(sql);
    } catch (err) {
      throw new Error(`migration ${file} failed: ${err.message}`);
    }
  }

  return { db, migrations: files };
}

/** Create an auth user; the schema's trigger creates the profile row. */
export async function createUser(db, email, fullName) {
  const res = await db.query(
    `insert into auth.users (email, raw_user_meta_data)
     values ($1, jsonb_build_object('full_name', $2::text))
     returning id`,
    [email, fullName],
  );
  return res.rows[0].id;
}

/**
 * Run `fn` as a signed-in user, exactly as PostgREST would: the authenticated
 * role plus a JWT claim carrying their id. Pass null for a signed-out caller.
 *
 * Everything happens inside a transaction so the role and claim are reset even
 * when the body throws, which the negative tests do constantly.
 */
export async function asUser(db, userId, fn) {
  await db.exec('begin');
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [
      userId ? JSON.stringify({ sub: userId, role: 'authenticated' }) : '',
    ]);
    await db.exec(`set local role ${userId ? 'authenticated' : 'anon'}`);
    const out = await fn();
    await db.exec('commit');
    return out;
  } catch (err) {
    await db.exec('rollback');
    throw err;
  }
}

/** Same as asUser, but the caller expects a failure and wants the message. */
export async function expectDenied(db, userId, fn) {
  try {
    await asUser(db, userId, fn);
    return null;
  } catch (err) {
    return err.message;
  }
}
