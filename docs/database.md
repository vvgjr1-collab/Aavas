# Database

Supabase (Postgres + Auth + Storage). The app is served from a static host and
wrapped by Capacitor, so there is no server of our own to run.

**The Supabase anon key is public.** It ships inside a bundle that anyone can
download from GitHub Pages, and that is how Supabase is designed to work. It
also means **Row Level Security is the entire security model**: if a policy is
wrong, anyone on the internet can read every rent agreement in the database.
That is why `npm run db:test` exists and why it runs in CI.

## The central idea: a tenancy

Before this schema, a tenant and a landlord each saw their own hardcoded copy of
reality — `TENANT_PROPERTY_ADDRESS` was a constant and `initialProperties` was a
seed array, with nothing joining them. A complaint could not reach a landlord
because no record connected the two.

The **tenancy** is that record: one tenant, one property, one landlord, a date
range, an agreed rent. Payments, complaints, documents and bookings all hang off
it, and onboarding exists to produce one.

```
profiles    (id → auth.users, name, email, phone, active_role, onboarding)
properties  (landlord_id → profiles, address, rent, deposit, …)
tenancies   (property_id?, landlord_id?, tenant_id?, source, status, rent, …)
invites     (tenancy_id, code, email, expires_at, accepted_at)
documents   (tenancy_id, kind, storage_path, uploaded_by)
payments / complaints / service_bookings   → all keyed by tenancy_id
```

## Role is a UI mode, not a permission

A person is not "a landlord" or "a tenant". They are the landlord *of*
properties they own and the tenant *of* tenancies they hold, and the same
account can be both — which is why the app lets you switch roles freely.

So **no policy keys off `profiles.active_role`.** Every rule derives from a real
relationship. `active_role` only decides which dashboard opens on launch. If it
ever starts granting access, switching role becomes privilege escalation.

## Two ways a tenancy begins

You cannot control which side signs up first, so both paths exist.

**Landlord-first.** Landlord adds a property → creates a pending tenancy with
the terms → issues an invite code → tenant calls `redeem_invite(code)`. The
landlord set the terms and issued the invite, so accepting is assent and the
tenancy goes straight to `active`.

The tenant never reads the `invites` table. Being able to query it by code is
being able to guess codes, so there is no select policy for them at all — only
the function, which validates expiry and prior use.

**Tenant-first.** A tenant who signs up before their landlord knows an address
and has a paper agreement, and nothing else — no property id, no landlord
account. So `tenancies.property_id` and `landlord_id` are nullable, and such a
row carries `claimed_address` plus `claimed_landlord_email` instead. The
landlord later finds it via `pending_claims_for_me()` (matched on their verified
email) and calls `confirm_tenancy(...)`, which attaches it to a real property.

A check constraint makes both columns mandatory the moment status becomes
`active`, so a tenancy in use is always complete.

## The landlord's figures win

The rent agreement is what both sides sign, and the landlord is the party who
confirms it. So the tenant's self-declared numbers are only ever a *proposal*:
they land in `proposed_rent` / `proposed_deposit` / `proposed_*_date` and stay
there as an audit trail, while `confirm_tenancy()` writes the agreed values.

RLS is row-level, not column-level, so a policy that lets a tenant update their
own tenancy would also let them rewrite the rent. `app.enforce_tenancy_authority()`
draws the column boundary instead — a tenant may correct what they proposed and
nothing else.

That trigger is **`SECURITY INVOKER` on purpose.** As `DEFINER`, `current_user`
inside it is always the owner, which made its "only police direct API writes"
check pass for everybody and silently turned the whole trigger into a no-op.
The tests caught exactly this. Don't change it without re-running them.

## Storage

One private bucket, `documents`. Every object is filed under its tenancy:

```
tenancies/<tenancy_id>/<kind>/<filename>
```

so access is decided from the path alone, with no lookup into
`public.documents`. The real logic is `app.can_access_document_path()`, which is
unit-tested including malformed uuids, traversal-shaped paths and nulls — all of
which must refuse rather than raise, because an error that escapes a policy can
fall through to permitted. The four bucket policies are one line of glue each.

## Running the tests

```bash
npm run db:test
```

PGlite is Postgres compiled to WASM, so roles, policies and RLS behave as they
do on the server. `supabase/tests/harness.mjs` recreates what Supabase provides
before our migrations run — the `auth` schema, an `auth.uid()` that reads the
request JWT, the anon/authenticated roles, and a minimal `storage` shim — then
applies `supabase/migrations/*.sql` in order. `asUser()` runs a block as a
signed-in user exactly as PostgREST would.

36 checks currently cover: invite redemption and its replay, the tenant-first
claim and its confirmation, every way a tenant might try to rewrite the agreed
terms, cross-tenancy isolation of documents and rows, counterparty profile
visibility, the payment reporting/confirmation split, and storage path parsing.

**What the tests do not cover**, and needs a real project to confirm:

- The API gateway and real JWT verification. `auth.uid()` here reads a GUC the
  harness sets; on Supabase it comes from a verified token.
- Supabase Storage itself. The path *logic* is tested; the bucket policies have
  never run against the real `storage.objects`.
- Auth flows — email confirmation, password reset, and the redirect handling a
  Capacitor shell needs.

## Applying it

Paste the three files in `supabase/migrations/` into the dashboard SQL editor,
**in filename order** - the policies reference tables the first file creates:

1. `20260904120000_schema.sql`
2. `20260904120100_policies.sql`
3. `20260904120200_storage.sql`

(`npx supabase db push` does the same thing, but needs a personal access token
and the database password.)

Then check two settings in the dashboard: **email confirmations on**, and the
`documents` bucket **not public** - the migration creates it private, and
`db:verify` checks it stayed that way.

## Verifying a live project

```bash
cp .env.example .env      # fill in from Project Settings -> API
npm run db:verify
```

This uses the anon key only - the same public credential the browser gets - so
it checks exactly what an anonymous stranger can reach. Every table must refuse
it, which means a PASS reads as "correctly denied".

It answers the things only a live project can: that the migrations actually
applied, that RLS is switched on, that no grant leaked to `anon`, and that the
documents bucket is private. The policy logic itself is covered by
`npm run db:test` against real Postgres.

## Configuration

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, from `.env` locally and from
GitHub Actions **repository variables** in CI. Variables rather than secrets on
purpose: Vite inlines every `VITE_` value into the bundle, so both are public
the moment the site ships. That is fine - the anon key grants nothing on its
own. The **service_role key bypasses RLS entirely** and must never appear in a
`VITE_` variable, in `.env`, or in the repository.

With neither set, the build still succeeds and the app runs in demo mode, so
guest login keeps working with no backend at all.
