-- Push Step 4's ranking into SQL. The catalogue is heading for thousands of
-- rows (see 0008); loading every is_active row into a serverless function's
-- memory on every gallery request, just to score and slice it in JS, stops
-- being "the small catalogue" shortcut and starts being the request's real
-- cost.
--
-- This mirrors rankReferences() in src/lib/logo-reference-query.ts:
--   - match_count counts each of a row's attributes that appears in
--     p_attributes — the SQL equivalent of
--     `attributes.filter(a => wanted.has(a)).length`.
--   - order by match_count desc, sort_order asc reproduces the in-memory
--     comparator exactly.
--   - total_count is a window function evaluated over the mark_type-filtered
--     set *before* ORDER BY/LIMIT apply, so it reports the same "how many
--     active rows matched the type filter" number the route used to get by
--     loading the unfiltered-by-attribute result set and reading its length.
--
-- One deliberate, documented difference: the in-memory version's tie-break
-- below sort_order fell out of whatever row order Supabase happened to
-- return — a `select` with no `order by` has no contractually defined order.
-- image_path is unique per row (0004b), so ordering by it turns an
-- undefined tie-break into a stable, deterministic one. This can only change
-- the order of rows that were already tied on both match_count and
-- sort_order, i.e. rows the old code was never guaranteed to order
-- consistently between two requests to begin with.
--
-- NOTE for reviewers: this has not been run against a live database. Smoke
-- test against staging before merging — in particular, confirm match_count
-- ordering against a few real filter combinations and compare with the
-- in-memory rankReferences() fallback the route still carries.
create or replace function public.logo_references_ranked(
  p_types      text[] default null,
  p_attributes text[] default '{}',
  p_limit      integer default 12
)
returns table (
  name         text,
  mark_type    text,
  image_path   text,
  attributes   text[],
  industry     text,
  sort_order   integer,
  aspect_ratio numeric,
  refinement   jsonb,
  match_count  integer,
  total_count  bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    lr.name,
    lr.mark_type,
    lr.image_path,
    lr.attributes,
    lr.industry,
    lr.sort_order,
    lr.aspect_ratio,
    lr.refinement,
    (
      select count(*)::int
      from unnest(lr.attributes) a
      where a = any (p_attributes)
    ) as match_count,
    count(*) over ()::bigint as total_count
  from public.logo_references lr
  where lr.is_active
    and (
      p_types is null
      or array_length(p_types, 1) is null
      or lr.mark_type = any (p_types)
    )
  order by match_count desc, lr.sort_order asc, lr.image_path asc
  limit greatest(1, least(coalesce(p_limit, 12), 48));
$$;

comment on function public.logo_references_ranked(text[], text[], integer) is
  'Ranks active logo_references rows by attribute overlap with p_attributes, '
  'ties broken by sort_order then image_path. total_count is count(*) over '
  'the mark_type-filtered set, evaluated before LIMIT — the same "how many '
  'rows matched the type filter" figure the route used to report. Mirrors '
  'rankReferences() in src/lib/logo-reference-query.ts; keep the two in step.';

-- logo_references is a shared, non-personal catalogue readable by anyone
-- (0004b's `logo_references_select_all` policy is `using (true)`) — this
-- function is called from a cookie-less client for exactly that reason (see
-- src/lib/supabase/public.ts), so it needs to run for the anon role too, not
-- only authenticated.
revoke all on function public.logo_references_ranked(text[], text[], integer) from public;
grant execute on function public.logo_references_ranked(text[], text[], integer)
  to anon, authenticated, service_role;
