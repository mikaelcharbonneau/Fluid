-- Step 4 replaces style sliders with a like/dislike gallery: every reference
-- carries a position on each refinement axis, and liking a mark averages the
-- client toward its values. They never touch a slider; the slider positions are
-- inferred from what they chose.
--
-- Four axes, each 0..1, deliberately independent of the nine STYLE WORLDS in
-- Step 2 — a Minimal mark can be quiet or bold, a Corporate one warm or cool —
-- so this refines within a world rather than duplicating the choice of world:
--   boldness  quiet .. bold        weight, scale, presence
--   energy    calm .. energetic    stillness vs motion
--   warmth    cool .. warm         clinical precision vs soft approachability
--   detail    simple .. detailed   one clean gesture vs richer construction
--
-- jsonb rather than four columns so a fifth axis doesn't need a migration.
alter table public.logo_references
  add column if not exists refinement jsonb;

comment on column public.logo_references.refinement is
  'Refinement axis positions (0..1): boldness, energy, warmth, detail. "_placeholder": true marks values that are not yet a real reading of the artwork.';

-- PLACEHOLDER VALUES. These are deliberately arbitrary: the plumbing is being
-- built before the library is catalogued for these axes, and the catalogue is
-- about to grow by orders of magnitude anyway.
--
-- Derived from a hash of the image path rather than random(), so they are
-- deterministic and reproducible — the same row always gets the same value,
-- independent of update order or session seed.
--
-- Every row is flagged so they can be found and replaced, and so the feature
-- can be gated on real data before it influences a real client's logo.
update public.logo_references
set refinement = jsonb_build_object(
      'boldness', round((('x' || substr(md5(image_path || ':boldness'), 1, 8))::bit(32)::bigint % 1001) / 1000.0, 3),
      'energy',   round((('x' || substr(md5(image_path || ':energy'),   1, 8))::bit(32)::bigint % 1001) / 1000.0, 3),
      'warmth',   round((('x' || substr(md5(image_path || ':warmth'),   1, 8))::bit(32)::bigint % 1001) / 1000.0, 3),
      'detail',   round((('x' || substr(md5(image_path || ':detail'),   1, 8))::bit(32)::bigint % 1001) / 1000.0, 3),
      '_placeholder', true
    ),
    updated_at = now()
where refinement is null;
