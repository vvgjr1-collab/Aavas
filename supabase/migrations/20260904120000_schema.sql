-- Aavas core schema.
--
-- The central record is the TENANCY: one tenant, one property, one landlord, a
-- date range and an agreed rent. Payments, complaints, documents and bookings
-- all hang off it, and it is what onboarding exists to produce. Before this,
-- the app had no record connecting a tenant to a landlord at all - each side
-- saw its own hardcoded copy of reality.
--
-- Role note: a person is not "a landlord" or "a tenant". They are the landlord
-- OF properties they own and the tenant OF tenancies they hold, and the same
-- account can be both - which is why the app lets you switch roles freely.
-- So no policy in this schema keys off profiles.active_role; every rule is
-- derived from an actual relationship. active_role is a UI preference only.

-- gen_random_uuid() is core Postgres since 13, so no pgcrypto needed.

-- Helper functions live in their own schema so they are not exposed through
-- PostgREST as callable endpoints.
create schema if not exists app;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('tenant', 'landlord');

create type public.property_type as enum
  ('apartment', 'house', 'villa', 'studio', 'penthouse');

create type public.property_status as enum ('occupied', 'vacant', 'maintenance');

-- pending  - self-declared by a tenant, not yet confirmed by the landlord
-- active   - confirmed by the landlord; its figures are authoritative
-- ended    - lease finished
-- rejected - landlord disputed the tenant's claim
create type public.tenancy_status as enum ('pending', 'active', 'ended', 'rejected');

-- Who created the tenancy. Decides whose figures start out authoritative.
create type public.tenancy_source as enum ('landlord', 'tenant');

create type public.document_kind as enum
  ('agreement', 'receipt', 'id_proof', 'complaint_photo', 'property_photo', 'other');

-- due      - scheduled, unpaid
-- reported - the tenant says they paid; not yet confirmed
-- paid     - the landlord confirmed receipt
create type public.payment_status as enum ('due', 'reported', 'paid');

create type public.complaint_status as enum ('open', 'in_progress', 'resolved', 'closed');

create type public.complaint_priority as enum ('low', 'medium', 'high', 'urgent');

create type public.booking_status as enum ('requested', 'confirmed', 'completed', 'cancelled');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null default '',
  email         text not null default '',
  phone         text,
  -- Which dashboard to open on next launch. Not a permission.
  active_role   public.user_role,
  -- Onboarding is resumable: someone who abandons halfway comes back to the
  -- step they left, not to the start and not to an empty dashboard. Kept as
  -- jsonb because these steps will churn far more often than the tables do,
  -- e.g. {"tenant": "agreement", "landlord": "done"}.
  onboarding    jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.profiles.active_role is
  'UI preference for which dashboard to open. Never used for authorisation.';

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------

create table public.properties (
  id            uuid primary key default gen_random_uuid(),
  landlord_id   uuid not null references public.profiles (id) on delete cascade,
  title         text not null,
  address_line  text not null,
  city          text not null default '',
  state         text not null default '',
  pincode       text not null default '',
  type          public.property_type not null default 'apartment',
  status        public.property_status not null default 'vacant',
  rent          numeric(12, 2) not null default 0 check (rent >= 0),
  deposit       numeric(12, 2) not null default 0 check (deposit >= 0),
  bedrooms      smallint not null default 0 check (bedrooms >= 0),
  bathrooms     smallint not null default 0 check (bathrooms >= 0),
  area_sqft     integer not null default 0 check (area_sqft >= 0),
  amenities     text[] not null default '{}',
  -- Storage object paths, not public URLs: the bucket is private and the app
  -- exchanges these for signed URLs.
  image_paths   text[] not null default '{}',
  rating        numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index properties_landlord_idx on public.properties (landlord_id);

-- ---------------------------------------------------------------------------
-- tenancies
-- ---------------------------------------------------------------------------

create table public.tenancies (
  id             uuid primary key default gen_random_uuid(),

  -- property_id and landlord_id are nullable on purpose. A tenant who signs up
  -- before their landlord cannot know either: they have an address and a paper
  -- agreement, nothing more. Such a row starts as 'pending' carrying
  -- claimed_address, and confirm_tenancy() attaches it to a real property and
  -- landlord. The check constraint below makes those columns mandatory the
  -- moment the tenancy goes active, so an in-use tenancy is always complete.
  property_id    uuid references public.properties (id) on delete cascade,
  -- Denormalised from properties so every policy on the tables below is a
  -- single lookup rather than a join through properties.
  landlord_id    uuid references public.profiles (id) on delete cascade,
  -- Null until an invited tenant accepts.
  tenant_id      uuid references public.profiles (id) on delete set null,

  -- Only for the tenant-first path, until a landlord claims it.
  claimed_address        text,
  claimed_landlord_email text,
  source         public.tenancy_source not null,
  status         public.tenancy_status not null default 'pending',

  -- The agreed figures. Authoritative once confirmed by the landlord, which is
  -- the decision the rent agreement records; app.enforce_tenancy_authority()
  -- stops a tenant editing them.
  rent           numeric(12, 2) not null default 0 check (rent >= 0),
  deposit        numeric(12, 2) not null default 0 check (deposit >= 0),
  start_date     date,
  end_date       date,

  -- What a self-declaring tenant claimed, kept for the landlord to compare
  -- against and as an audit trail after confirmation.
  proposed_rent      numeric(12, 2) check (proposed_rent >= 0),
  proposed_deposit   numeric(12, 2) check (proposed_deposit >= 0),
  proposed_start_date date,
  proposed_end_date   date,

  confirmed_at   timestamptz,
  confirmed_by   uuid references public.profiles (id) on delete set null,
  created_by     uuid not null references public.profiles (id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint tenancy_dates_ordered
    check (start_date is null or end_date is null or start_date <= end_date),
  constraint tenancy_confirmed_fields
    check ((status = 'active') = (confirmed_at is not null)),
  -- An active tenancy is always fully formed: both parties and a property.
  constraint tenancy_active_is_complete
    check (
      status <> 'active'
      or (property_id is not null and landlord_id is not null and tenant_id is not null)
    ),
  -- A tenant-declared row must say where it is, or it cannot be claimed.
  constraint tenancy_claim_has_address
    check (source <> 'tenant' or property_id is not null or claimed_address is not null)
);

create index tenancies_tenant_idx   on public.tenancies (tenant_id);
create index tenancies_landlord_idx on public.tenancies (landlord_id);
create index tenancies_property_idx on public.tenancies (property_id);

-- One live tenancy per property. Ended and rejected rows stay for history.
create unique index tenancies_one_live_per_property
  on public.tenancies (property_id)
  where status in ('pending', 'active');

-- ---------------------------------------------------------------------------
-- invites
-- ---------------------------------------------------------------------------

create table public.invites (
  id           uuid primary key default gen_random_uuid(),
  tenancy_id   uuid not null references public.tenancies (id) on delete cascade,
  code         text not null unique,
  email        text,
  created_by   uuid not null references public.profiles (id) on delete cascade,
  expires_at   timestamptz not null default now() + interval '14 days',
  accepted_at  timestamptz,
  accepted_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index invites_tenancy_idx on public.invites (tenancy_id);

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------

create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  tenancy_id   uuid not null references public.tenancies (id) on delete cascade,
  kind         public.document_kind not null default 'other',
  -- Path inside the private 'documents' storage bucket. The path is
  -- tenancy-scoped so the storage policy can authorise from the path alone -
  -- see app.can_access_document_path().
  storage_path text not null unique,
  file_name    text not null default '',
  mime_type    text not null default '',
  size_bytes   bigint not null default 0 check (size_bytes >= 0),
  uploaded_by  uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create index documents_tenancy_idx on public.documents (tenancy_id, kind);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  tenancy_id    uuid not null references public.tenancies (id) on delete cascade,
  amount        numeric(12, 2) not null check (amount >= 0),
  due_date      date,
  paid_at       timestamptz,
  method        text not null default '',
  reference     text not null default '',
  status        public.payment_status not null default 'due',
  recorded_by   uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index payments_tenancy_idx on public.payments (tenancy_id, due_date desc);

-- ---------------------------------------------------------------------------
-- complaints
-- ---------------------------------------------------------------------------

create table public.complaints (
  id           uuid primary key default gen_random_uuid(),
  tenancy_id   uuid not null references public.tenancies (id) on delete cascade,
  category     text not null default '',
  title        text not null,
  description  text not null default '',
  priority     public.complaint_priority not null default 'medium',
  status       public.complaint_status not null default 'open',
  created_by   uuid not null references public.profiles (id) on delete cascade,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index complaints_tenancy_idx on public.complaints (tenancy_id, status);

-- ---------------------------------------------------------------------------
-- service_bookings
-- ---------------------------------------------------------------------------

create table public.service_bookings (
  id             uuid primary key default gen_random_uuid(),
  tenancy_id     uuid not null references public.tenancies (id) on delete cascade,
  provider_name  text not null,
  category       text not null default '',
  scheduled_for  timestamptz,
  notes          text not null default '',
  status         public.booking_status not null default 'requested',
  created_by     uuid not null references public.profiles (id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index service_bookings_tenancy_idx on public.service_bookings (tenancy_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch        before update on public.profiles
  for each row execute function app.touch_updated_at();
create trigger properties_touch      before update on public.properties
  for each row execute function app.touch_updated_at();
create trigger tenancies_touch       before update on public.tenancies
  for each row execute function app.touch_updated_at();
create trigger payments_touch        before update on public.payments
  for each row execute function app.touch_updated_at();
create trigger complaints_touch      before update on public.complaints
  for each row execute function app.touch_updated_at();
create trigger service_bookings_touch before update on public.service_bookings
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- A profile row for every new auth user
-- ---------------------------------------------------------------------------

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();
