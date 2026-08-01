-- The reference library: real logos, catalogued so the logo studio can show a
-- client marks that match the brief they just gave.
--
-- BACK-FILLED. This table was created directly against the project rather than
-- through a migration, so migrations 0005-0007 altered a table the repo had no
-- record of and a fresh environment could not be provisioned from source. This
-- file reconstructs the original shape. The "0004b" prefix is deliberate: it
-- sorts after the existing 0004 and before 0005-0007, which alter this table
-- and would fail against a fresh database if it did not already exist.
--
-- Written to be safe to run against the existing project: everything is
-- IF NOT EXISTS, so applying it where the table already exists is a no-op.
--
-- Images live in the public "logo-references" storage bucket; image_path is the
-- object path within it (e.g. "Wordmark/erbert.png").
create table if not exists public.logo_references (
  id           uuid primary key default gen_random_uuid(),
  -- The brand the mark belongs to, read off the artwork rather than the
  -- filename — many source files are named "Instagram-2.jpg" and similar.
  name         text not null default '',
  -- One of the classic identity taxonomy types. Constrained below; kept as
  -- text rather than an enum so the set can be revised without a type rewrite.
  mark_type    text not null,
  image_path   text not null unique,
  -- Formal qualities catalogued from the artwork (geometric, monoline, heavy,
  -- organic…). Step 2's visual directions are matched against these, so a
  -- direction can be illustrated with marks that genuinely share its language.
  attributes   text[] not null default '{}',
  industry     text,
  notes        text,
  -- Duplicate uploads are kept but deactivated, so the gallery never shows the
  -- same mark twice while the row still records why it is hidden.
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'logo_references_mark_type_check'
  ) then
    alter table public.logo_references
      add constraint logo_references_mark_type_check
      check (mark_type = any (array[
        'wordmark','lettermark','pictorial',
        'abstract','mascot','combination','emblem'
      ]));
  end if;
end $$;

-- The gallery is filtered by type and ordered within it on every request.
create index if not exists logo_references_mark_type_idx
  on public.logo_references (mark_type, sort_order)
  where is_active;

-- Attribute matching is a containment/overlap test, which needs GIN.
create index if not exists logo_references_attributes_idx
  on public.logo_references using gin (attributes);

alter table public.logo_references enable row level security;

-- A shared, non-personal catalogue: readable by anyone, writable only by the
-- service role (which bypasses RLS), so there is deliberately no write policy.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'logo_references'
      and policyname = 'logo_references_select_all'
  ) then
    create policy logo_references_select_all
      on public.logo_references for select using (true);
  end if;
end $$;
