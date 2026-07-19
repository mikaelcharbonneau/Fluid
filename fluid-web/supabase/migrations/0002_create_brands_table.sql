-- Phase 2b: per-user brand persistence.
-- Applied to the Supabase project via the MCP apply_migration tool.
create table if not exists public.brands (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null default 'Untitled brand',
  brief        text not null default '',
  audience     text not null default '',
  competitors  text not null default '',
  style_id     text,
  name_choice  text,
  logo_choice  text,
  data         jsonb not null default '{}'::jsonb,
  status       text not null default 'draft' check (status in ('draft', 'live')),
  step         int  not null default 1 check (step between 1 and 5),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists brands_user_id_updated_at_idx
  on public.brands (user_id, updated_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists brands_touch_updated_at on public.brands;
create trigger brands_touch_updated_at
  before update on public.brands
  for each row execute function public.touch_updated_at();

alter table public.brands enable row level security;

drop policy if exists "brands_select_own" on public.brands;
create policy "brands_select_own" on public.brands
  for select using (auth.uid() = user_id);

drop policy if exists "brands_insert_own" on public.brands;
create policy "brands_insert_own" on public.brands
  for insert with check (auth.uid() = user_id);

drop policy if exists "brands_update_own" on public.brands;
create policy "brands_update_own" on public.brands
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "brands_delete_own" on public.brands;
create policy "brands_delete_own" on public.brands
  for delete using (auth.uid() = user_id);
