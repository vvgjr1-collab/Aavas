-- Calls join the record.
--
-- The conversation table already holds every text between the two parties and
-- refuses to let anyone change or remove one. A call left no trace at all: the
-- app hands a number to the phone and hears nothing back, so half of how a
-- landlord and tenant actually talk was missing from the only place either of
-- them can point at afterwards.
--
-- What can honestly be recorded is that a call was *placed from Aavas*, by
-- whom, and when. Not whether it connected, not who answered, not how long it
-- lasted - the browser is not on the call and cannot know. The screen that
-- used to show "5:23, completed" was inventing all three, and this deliberately
-- records less than that so what it does record is true.
--
-- One table rather than two, because a repository of communication that is
-- split across two orderings is not a repository. The immutability that
-- already covers texts covers calls by construction.

create type public.message_kind as enum ('text', 'call');

alter table public.messages
  add column kind public.message_kind not null default 'text';

-- A call has no words in it. Everything else must still say something.
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check
  check (
    (kind = 'call' and body = '')
    or (kind = 'text' and length(btrim(body)) between 1 and 4000)
  );

comment on column public.messages.kind is
  'text = something written. call = a call placed from the app; nothing about '
  'whether it connected is known, so nothing about that is stored.';

/**
 * Extends the immutability rule to the new column.
 *
 * Without this, a call entry could be relabelled as a text and given words
 * nobody said - which is exactly the edit the trigger exists to prevent.
 */
create or replace function app.enforce_message_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenancy_id is distinct from old.tenancy_id
     or new.sender_id is distinct from old.sender_id
     or new.body is distinct from old.body
     or new.kind is distinct from old.kind
     or new.created_at is distinct from old.created_at
  then
    raise exception 'a message cannot be changed once sent' using errcode = '42501';
  end if;

  if old.read_at is not null and new.read_at is distinct from old.read_at then
    raise exception 'a message cannot be marked unread' using errcode = '42501';
  end if;

  return new;
end;
$$;
