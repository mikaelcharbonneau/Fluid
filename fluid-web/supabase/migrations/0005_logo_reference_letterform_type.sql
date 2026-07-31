-- The Step 4 rework split the mark-type taxonomy in two directions that the
-- logo_references CHECK constraint never caught up with:
--
--   lettermark  — a monogram of TWO OR MORE letters (IBM, HBO)
--   letterform  — a SINGLE letter pushed past ordinary type (Unilever's U)
--
-- src/lib/logo-styles.ts carries both, but the constraint only allowed
-- 'lettermark', so single-letter references had nowhere correct to live and
-- were being filed as monograms. Widen the constraint to match the app.
--
-- Purely additive: every previously valid value stays valid, so no existing
-- row is invalidated by this change.

alter table public.logo_references
  drop constraint logo_references_mark_type_check;

alter table public.logo_references
  add constraint logo_references_mark_type_check
  check (mark_type = any (array[
    'wordmark',
    'lettermark',
    'letterform',
    'pictorial',
    'abstract',
    'mascot',
    'combination',
    'emblem'
  ]));
