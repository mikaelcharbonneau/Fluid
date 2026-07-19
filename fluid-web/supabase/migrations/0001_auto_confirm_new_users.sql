-- Phase 2 MVP: instant access — new email/password signups are auto-confirmed
-- so a session is issued immediately, without requiring an email round-trip.
-- (Product decision; tighten to real email confirmation later.)
-- Applied to the Supabase project via the MCP apply_migration tool.
create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_auto_confirm on auth.users;

create trigger on_auth_user_created_auto_confirm
  before insert on auth.users
  for each row
  execute function public.auto_confirm_user();
