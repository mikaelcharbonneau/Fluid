-- Atomic shallow merge into brands.data.
--
-- The wizard autosaves by sending the whole `data` object from its own copy —
-- `setField('data', { ...data, logo_types: next })`, in fifteen places. The
-- PATCH handler then replaced the column wholesale, so any key written by a
-- server route since the client last refreshed was silently dropped on the next
-- keystroke.
--
-- That is not hypothetical: brands that had drawn a board were losing
-- `creative_platform` and `research`, so every subsequent board press
-- regenerated a platform and re-ran category research that had already been
-- paid for. `logo_finalists` would have gone the same way once refinement
-- started writing it.
--
-- Done in SQL rather than read-modify-write in the route because two saves can
-- overlap — a debounced field save landing while a generation route writes its
-- result is exactly the collision that loses data. `||` is a single statement,
-- so the row is never read into the application and written back stale.
--
-- Shallow by design: the client owns whole sub-objects like `step2` and expects
-- to replace them, and nothing in the wizard needs to delete a key (clearing
-- sends `[]` or `null`, which are values and merge correctly).
--
-- SECURITY INVOKER so row-level security still applies: a caller can only merge
-- into a brand they own, exactly as with a direct update.
create or replace function public.brands_merge_data(p_id uuid, p_patch jsonb)
returns setof public.brands
language sql
security invoker
set search_path = public
as $$
  update public.brands
  set data = coalesce(data, '{}'::jsonb) || coalesce(p_patch, '{}'::jsonb)
  where id = p_id
  returning *;
$$;

comment on function public.brands_merge_data(uuid, jsonb) is
  'Shallow-merges p_patch into brands.data atomically, so a client autosave '
  'cannot drop keys written by server routes. RLS applies (security invoker).';
