-- spend_tokens() only ever receives hardcoded positive constants from the
-- app today, but the function itself trusted p_amount unconditionally: a
-- negative amount would satisfy `token_balance >= p_amount` and increase the
-- balance instead of spending it. Guard the RPC itself so that stays true
-- even if a future caller (or a bypass of the Next.js routes) forwards a
-- client-supplied amount.
create or replace function public.spend_tokens(p_user uuid, p_amount integer)
returns integer language plpgsql security definer as $$
declare remaining integer;
begin
  if p_amount <= 0 then
    raise exception 'p_amount must be positive';
  end if;

  update public.subscriptions
    set token_balance = token_balance - p_amount
    where user_id = p_user and token_balance >= p_amount
    returning token_balance into remaining;
  return remaining;
end;
$$;

-- Same defense-in-depth for the refill/grant path: a negative amount here
-- would silently deduct tokens instead of adding them.
create or replace function public.grant_tokens(p_user uuid, p_amount integer)
returns integer language plpgsql security definer as $$
declare remaining integer;
begin
  if p_amount <= 0 then
    raise exception 'p_amount must be positive';
  end if;

  update public.subscriptions
    set token_balance = token_balance + p_amount
    where user_id = p_user
    returning token_balance into remaining;
  return remaining;
end;
$$;
