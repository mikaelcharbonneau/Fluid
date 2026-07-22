-- Token-based billing: a monthly token balance refilled by the subscription
-- tier, spent on generation. Small requests cost 1, asset generation costs 3.

alter table public.subscriptions
  add column if not exists token_balance integer not null default 0,
  add column if not exists tier text not null default 'free',
  add column if not exists monthly_tokens integer not null default 0,
  add column if not exists last_invoice_id text;

-- Give brand-new users a starting balance (and a row). Covers every signup
-- path (email + OAuth). SECURITY DEFINER so it can write from the auth trigger.
create or replace function public.grant_free_tokens()
returns trigger language plpgsql security definer as $$
begin
  insert into public.subscriptions (user_id, token_balance, tier)
  values (new.id, 20, 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_grant_free_tokens on auth.users;
create trigger trg_grant_free_tokens
  after insert on auth.users
  for each row execute function public.grant_free_tokens();

-- Backfill existing users with the free grant.
insert into public.subscriptions (user_id, token_balance, tier)
select id, 20, 'free' from auth.users
on conflict (user_id) do nothing;

-- Atomic spend: decrement only if the balance is sufficient; returns the
-- remaining balance, or NULL when there weren't enough tokens.
create or replace function public.spend_tokens(p_user uuid, p_amount integer)
returns integer language plpgsql security definer as $$
declare remaining integer;
begin
  update public.subscriptions
    set token_balance = token_balance - p_amount
    where user_id = p_user and token_balance >= p_amount
    returning token_balance into remaining;
  return remaining;
end;
$$;

-- Add tokens (monthly refill / top-up). Returns the new balance.
create or replace function public.grant_tokens(p_user uuid, p_amount integer)
returns integer language plpgsql security definer as $$
declare remaining integer;
begin
  update public.subscriptions
    set token_balance = token_balance + p_amount
    where user_id = p_user
    returning token_balance into remaining;
  return remaining;
end;
$$;
