-- Supabase's security advisor flags spend_tokens/grant_tokens/grant_free_tokens
-- as SECURITY DEFINER functions callable by the `anon` and `authenticated`
-- PostgREST roles via /rest/v1/rpc/<fn> — i.e. by anyone holding the public
-- anon key, with arbitrary p_user/p_amount, bypassing every server-side
-- billing check. Postgres grants EXECUTE to PUBLIC by default on CREATE
-- FUNCTION, so revoking from anon/authenticated alone is a no-op (verified:
-- has_function_privilege('anon', ..., 'EXECUTE') still returned true after
-- an anon/authenticated-only revoke) — PUBLIC must be revoked directly, then
-- execute re-granted to the roles that legitimately need it. All real
-- callers use the service-role admin client (src/lib/credits.ts, the Stripe
-- webhook) or fire as auth.users triggers, neither of which needs a role
-- grant: triggers run under the function's own privileges regardless of
-- caller grants, and service_role/postgres already bypass RLS and are
-- unaffected by revoking PUBLIC.
revoke execute on function public.spend_tokens(uuid, integer) from public;
revoke execute on function public.grant_tokens(uuid, integer) from public;
revoke execute on function public.grant_free_tokens() from public;
revoke execute on function public.auto_confirm_user() from public;

grant execute on function public.spend_tokens(uuid, integer) to service_role;
grant execute on function public.grant_tokens(uuid, integer) to service_role;

-- Defense-in-depth: pin search_path on every SECURITY DEFINER/trigger
-- function the advisor flagged as having a mutable search_path.
alter function public.touch_subscriptions_updated_at() set search_path = public;
alter function public.grant_free_tokens() set search_path = public;
alter function public.spend_tokens(uuid, integer) set search_path = public;
alter function public.grant_tokens(uuid, integer) set search_path = public;
