-- A photo can belong to a complaint.
--
-- "Photo Evidence (Optional)" on the complaint form invented a filename -
-- photo_1757340000000.jpg - and put it in a list. No file was read, nothing was
-- uploaded, and the landlord never saw anything. A tenant photographing a
-- damp patch got a convincing row of chips and sent nobody a picture.
--
-- Documents already have a table, a private bucket and policies covering both
-- parties to a tenancy, and 'complaint_photo' has been one of the kinds since
-- the first schema. The only piece missing was which complaint a photo is
-- about, so a landlord looking at one can see the picture rather than hunting
-- through every file on the tenancy.
--
-- Nullable, because most documents - the agreement, police verification - are
-- about the tenancy rather than any single complaint. On delete set null so
-- removing a complaint does not silently destroy the photographs of it.

alter table public.documents
  add column complaint_id uuid references public.complaints (id) on delete set null;

create index documents_complaint_idx
  on public.documents (complaint_id)
  where complaint_id is not null;

comment on column public.documents.complaint_id is
  'Set when the file is evidence for one complaint. Null for anything about '
  'the tenancy as a whole.';

-- The existing policies already cover this: a document is readable, insertable
-- and deletable by the parties to its tenancy, and a complaint belongs to the
-- same tenancy. Nothing new is exposed by naming which complaint it concerns.
