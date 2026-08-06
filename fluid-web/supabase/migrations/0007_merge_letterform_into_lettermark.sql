-- "Letterform" (a single letter as the mark) was briefly split out from
-- "lettermark" (a monogram of two or more). The distinction is real to a
-- designer but not one a client should have to make on a card, and it left
-- single-letter references unreachable from a type grid that never offered it.
--
-- Both are now "lettermark": the brief is "build the mark from the initials",
-- and the guidance covers one letter or several. This reverses the type added
-- in 0005.
update public.logo_references
set mark_type = 'lettermark',
    notes = trim(both ' ' from coalesce(notes || ' · ', '') ||
                 'single-letter mark; letterform merged into lettermark'),
    updated_at = now()
where mark_type = 'letterform';

-- Remove it from the allowed set so it cannot come back through a later insert.
alter table public.logo_references
  drop constraint logo_references_mark_type_check;

alter table public.logo_references
  add constraint logo_references_mark_type_check
  check (mark_type = any (array[
    'wordmark','lettermark','pictorial',
    'abstract','mascot','combination','emblem'
  ]));
