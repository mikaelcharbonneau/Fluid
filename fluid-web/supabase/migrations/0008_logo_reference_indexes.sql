-- The catalogue is heading for thousands of rows. Every Step 4 request filters
-- by mark type and orders within it, and attribute matching is a containment
-- test — which needs GIN. These are declared in the back-filled table
-- definition (0004b) too, so a fresh database and this one end up identical.
create index if not exists logo_references_mark_type_idx
  on public.logo_references (mark_type, sort_order)
  where is_active;

create index if not exists logo_references_attributes_idx
  on public.logo_references using gin (attributes);
