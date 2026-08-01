-- Which images sit in the logo-references bucket with no catalogue row yet.
--
-- storage.objects is not reachable through PostgREST, so the auto-tagger can't
-- express this as a client-side join. These wrap it instead of exposing the
-- whole storage schema to the API.
--
-- SECURITY DEFINER because storage.objects is not readable by the API roles.
-- Both are read-only, take no free-form SQL, and are callable only by the
-- service role — the route sits behind a shared secret on top of that.
create or replace function public.logo_references_untagged(
  p_prefix text default '',
  p_limit  integer default 10
)
returns table (image_path text)
language sql
security definer
set search_path = public, storage
as $$
  select o.name
  from storage.objects o
  join storage.buckets b on b.id = o.bucket_id
  left join public.logo_references lr on lr.image_path = o.name
  where b.name = 'logo-references'
    and lr.id is null
    -- Supabase writes a zero-byte placeholder to keep an empty folder alive.
    and o.name not like '%.emptyFolderPlaceholder'
    and (p_prefix = '' or o.name like p_prefix || '%')
  order by o.name
  limit greatest(1, least(p_limit, 100));
$$;

create or replace function public.logo_references_untagged_count(
  p_prefix text default ''
)
returns integer
language sql
security definer
set search_path = public, storage
as $$
  select count(*)::int
  from storage.objects o
  join storage.buckets b on b.id = o.bucket_id
  left join public.logo_references lr on lr.image_path = o.name
  where b.name = 'logo-references'
    and lr.id is null
    and o.name not like '%.emptyFolderPlaceholder'
    and (p_prefix = '' or o.name like p_prefix || '%');
$$;

revoke all on function public.logo_references_untagged(text, integer) from public, anon, authenticated;
revoke all on function public.logo_references_untagged_count(text) from public, anon, authenticated;
grant execute on function public.logo_references_untagged(text, integer) to service_role;
grant execute on function public.logo_references_untagged_count(text) to service_role;
