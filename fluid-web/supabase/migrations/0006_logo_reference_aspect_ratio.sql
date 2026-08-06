-- Step 4 shows the reference library as a masonry collage, where each card
-- takes its image's own proportions rather than being letterboxed into a
-- uniform tile. Without a known ratio the browser can't reserve space before a
-- lazily-loaded image arrives, so the columns visibly jump as the gallery
-- fills in — the one thing that makes a collage layout feel broken.
--
-- Storing width/height as a single ratio lets the card reserve the right box
-- up front. Nullable: a row without one simply falls back to natural sizing.
--
-- Values for the catalogued references were measured from the images
-- themselves and backfilled alongside this migration.
alter table public.logo_references
  add column if not exists aspect_ratio numeric(6,4);

comment on column public.logo_references.aspect_ratio is
  'Image width divided by height, used to reserve layout space in the masonry gallery.';
