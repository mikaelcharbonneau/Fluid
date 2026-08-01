-- Captions for the reference library.
--
-- The refinement axes (0011's predecessor) tell a generator HOW a mark is
-- drawn — weight, energy, warmth, detail. Useful, but four numbers is about as
-- much information as a mood dial, and it turned out not to be enough: boards
-- came back technically on-brief and formally generic, because nothing in the
-- signal said what makes a mark ownable.
--
-- A caption carries the design thinking instead. Three fields, deliberately
-- separate so each can be held at its own altitude:
--
--   technique — how the mark is constructed and drawn
--   device    — the single ownable move, stated as a CLASS of move so it can
--               transfer to an unrelated brand. Null when the mark has no
--               device and its interest is purely in execution.
--   concept   — what the form is doing semantically. Null when purely formal.
--
-- The device field is the point, and also the risk: these are real third-party
-- marks, and a device written as a recipe rather than a principle would make a
-- knockoff machine. That discipline lives in the captioning prompt.
--
-- Null caption means "not yet captioned" and is the backfill queue.

alter table public.logo_references
  add column if not exists caption jsonb;

-- The backfill queue, and the gallery's lookup by path both benefit.
create index if not exists logo_references_uncaptioned_idx
  on public.logo_references (sort_order)
  where caption is null and is_active = true;

comment on column public.logo_references.caption is
  'Design-thinking caption: {technique, device, concept}. device/concept may be null when the mark genuinely has neither. Null column = not yet captioned.';
