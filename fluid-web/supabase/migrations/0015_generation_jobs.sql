-- Durable generation jobs. The API only enqueues work; a separately invoked
-- worker claims jobs under a lease so an interrupted function can be recovered.

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  action text not null check (action in ('logo_board')),
  vendor text not null default 'openai',
  input jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  phase text not null default 'queued',
  progress integer not null default 0 check (progress between 0 and 100),
  attempt_count integer not null default 0,
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  next_run_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  provider_started_at timestamptz,
  cancellation_requested_at timestamptz,
  result jsonb,
  error jsonb,
  credit_amount integer not null default 0 check (credit_amount >= 0),
  credit_state text not null default 'none' check (credit_state in ('none', 'reserved', 'committed', 'refunded')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists generation_jobs_ready_idx
  on public.generation_jobs (next_run_at, created_at)
  where status = 'queued';
create index if not exists generation_jobs_user_idx
  on public.generation_jobs (user_id, created_at desc);
create index if not exists generation_jobs_brand_idx
  on public.generation_jobs (brand_id, created_at desc);
-- The queue never runs two jobs for the same account against the same vendor.
create unique index if not exists generation_jobs_vendor_account_running_idx
  on public.generation_jobs (user_id, vendor)
  where status = 'running';

create table if not exists public.generation_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.generation_jobs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null check (amount > 0),
  state text not null check (state in ('reserved', 'committed', 'refunded')),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create or replace function public.touch_generation_jobs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_generation_jobs_updated_at on public.generation_jobs;
create trigger trg_generation_jobs_updated_at
  before update on public.generation_jobs
  for each row execute function public.touch_generation_jobs_updated_at();

alter table public.generation_jobs enable row level security;
alter table public.generation_credit_ledger enable row level security;

drop policy if exists "read own generation jobs" on public.generation_jobs;
create policy "read own generation jobs" on public.generation_jobs
  for select using (auth.uid() = user_id);
drop policy if exists "read own generation credit ledger" on public.generation_credit_ledger;
create policy "read own generation credit ledger" on public.generation_credit_ledger
  for select using (auth.uid() = user_id);

-- Creates (or returns) one job and reserves its credits atomically. The
-- idempotency key is intentionally scoped to a user, not a browser session.
create or replace function public.enqueue_generation_job(
  p_user uuid,
  p_brand uuid,
  p_action text,
  p_vendor text,
  p_input jsonb,
  p_idempotency_key text,
  p_credit_amount integer
)
returns public.generation_jobs
language plpgsql security definer set search_path = public as $$
declare
  existing public.generation_jobs;
  created public.generation_jobs;
  balance integer;
begin
  select * into existing
  from public.generation_jobs
  where user_id = p_user and idempotency_key = p_idempotency_key
  for update;
  if found then
    return existing;
  end if;

  if not exists (select 1 from public.brands where id = p_brand and user_id = p_user) then
    raise exception 'brand_not_found';
  end if;

  if p_credit_amount > 0 then
    select token_balance into balance
    from public.subscriptions
    where user_id = p_user
    for update;
    if coalesce(balance, 0) < p_credit_amount then
      raise exception 'insufficient_tokens';
    end if;
    update public.subscriptions
    set token_balance = token_balance - p_credit_amount
    where user_id = p_user;
  end if;

  insert into public.generation_jobs (
    user_id, brand_id, action, vendor, input, idempotency_key,
    credit_amount, credit_state
  ) values (
    p_user, p_brand, p_action, p_vendor, coalesce(p_input, '{}'::jsonb), p_idempotency_key,
    p_credit_amount, case when p_credit_amount > 0 then 'reserved' else 'none' end
  ) returning * into created;

  if p_credit_amount > 0 then
    insert into public.generation_credit_ledger (job_id, user_id, amount, state)
    values (created.id, p_user, p_credit_amount, 'reserved');
  end if;
  return created;
end;
$$;

-- Requeues expired leases before claiming the next available job. An expired
-- final attempt is failed and refunded in the same transaction.
create or replace function public.claim_generation_job(p_lease_seconds integer default 295)
returns setof public.generation_jobs
language plpgsql security definer set search_path = public as $$
declare
  claimed public.generation_jobs;
begin
  with expired as (
    update public.generation_jobs
    set status = case when attempt_count >= max_attempts or provider_started_at is not null then 'failed' else 'queued' end,
        phase = case when attempt_count >= max_attempts or provider_started_at is not null then 'failed' else 'queued' end,
        next_run_at = now(),
        lease_expires_at = null,
        error = coalesce(error, jsonb_build_object('message', 'Worker lease expired.')),
        completed_at = case when attempt_count >= max_attempts or provider_started_at is not null then now() else completed_at end
    where status = 'running' and lease_expires_at < now()
    returning id, user_id, credit_amount, credit_state, attempt_count, max_attempts, provider_started_at
  ), refunded as (
    update public.subscriptions s
    set token_balance = s.token_balance + e.credit_amount
    from expired e
    where (e.attempt_count >= e.max_attempts or e.provider_started_at is not null)
      and e.credit_state = 'reserved'
      and s.user_id = e.user_id
    returning e.id
  )
  update public.generation_jobs j
  set credit_state = 'refunded'
  from refunded r
  where j.id = r.id;

  update public.generation_credit_ledger l
  set state = 'refunded', settled_at = now()
  from public.generation_jobs j
  where l.job_id = j.id and j.credit_state = 'refunded' and l.state = 'reserved';

  select j.* into claimed
  from public.generation_jobs j
  where j.status = 'queued'
    and j.next_run_at <= now()
    and j.cancellation_requested_at is null
    and not exists (
      select 1 from public.generation_jobs running
      where running.user_id = j.user_id
        and running.vendor = j.vendor
        and running.status = 'running'
    )
  order by j.created_at
  for update skip locked
  limit 1;

  if not found then
    return;
  end if;

  update public.generation_jobs
  set status = 'running', phase = 'starting', progress = greatest(progress, 1),
      attempt_count = attempt_count + 1, started_at = coalesce(started_at, now()),
      lease_expires_at = now() + make_interval(secs => greatest(30, p_lease_seconds))
  where id = claimed.id
  returning * into claimed;
  return next claimed;
end;
$$;

create or replace function public.complete_generation_job(p_job uuid, p_result jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare job public.generation_jobs;
begin
  select * into job from public.generation_jobs where id = p_job for update;
  if not found or job.status <> 'running' then return; end if;
  if job.cancellation_requested_at is not null then
    update public.generation_jobs
    set status = 'cancelled', phase = 'cancelled', error = jsonb_build_object('message', 'Cancelled by user.'),
        lease_expires_at = null, completed_at = now(),
        credit_state = case when credit_state = 'reserved' then 'refunded' else credit_state end
    where id = p_job;
    if job.credit_state = 'reserved' then
      update public.subscriptions set token_balance = token_balance + job.credit_amount where user_id = job.user_id;
      update public.generation_credit_ledger set state = 'refunded', settled_at = now() where job_id = p_job and state = 'reserved';
    end if;
    return;
  end if;
  update public.generation_jobs
  set status = 'succeeded', phase = 'complete', progress = 100, result = p_result,
      lease_expires_at = null, completed_at = now(), credit_state = case when credit_state = 'reserved' then 'committed' else credit_state end
  where id = p_job;
  update public.generation_credit_ledger
  set state = 'committed', settled_at = now()
  where job_id = p_job and state = 'reserved';
end;
$$;

create or replace function public.fail_generation_job(p_job uuid, p_error jsonb, p_retryable boolean)
returns void language plpgsql security definer set search_path = public as $$
declare job public.generation_jobs;
declare terminal boolean;
begin
  select * into job from public.generation_jobs where id = p_job for update;
  if not found or job.status <> 'running' then return; end if;
  terminal := job.cancellation_requested_at is not null or not p_retryable or job.attempt_count >= job.max_attempts;

  update public.generation_jobs
  set status = case when job.cancellation_requested_at is not null then 'cancelled' when terminal then 'failed' else 'queued' end,
      phase = case when job.cancellation_requested_at is not null then 'cancelled' when terminal then 'failed' else 'retrying' end,
      error = p_error, lease_expires_at = null,
      next_run_at = case when terminal then next_run_at else now() + make_interval(secs => least(300, 15 * (2 ^ greatest(0, attempt_count - 1))::integer)) end,
      completed_at = case when terminal then now() else null end
  where id = p_job;

  if terminal and job.credit_state = 'reserved' then
    update public.subscriptions set token_balance = token_balance + job.credit_amount where user_id = job.user_id;
    update public.generation_jobs set credit_state = 'refunded' where id = p_job;
    update public.generation_credit_ledger set state = 'refunded', settled_at = now() where job_id = p_job and state = 'reserved';
  end if;
end;
$$;

create or replace function public.cancel_generation_job(p_job uuid, p_user uuid)
returns public.generation_jobs
language plpgsql security definer set search_path = public as $$
declare job public.generation_jobs;
begin
  select * into job from public.generation_jobs where id = p_job and user_id = p_user for update;
  if not found then raise exception 'job_not_found'; end if;
  if job.status in ('succeeded', 'failed', 'cancelled') then return job; end if;
  if job.status = 'running' then
    update public.generation_jobs set cancellation_requested_at = now() where id = p_job returning * into job;
    return job;
  end if;
  update public.generation_jobs
  set status = 'cancelled', phase = 'cancelled', cancellation_requested_at = now(), completed_at = now(),
      credit_state = case when credit_state = 'reserved' then 'refunded' else credit_state end
  where id = p_job returning * into job;
  if job.credit_state = 'refunded' then
    update public.subscriptions set token_balance = token_balance + job.credit_amount where user_id = job.user_id;
    update public.generation_credit_ledger set state = 'refunded', settled_at = now() where job_id = p_job and state = 'reserved';
  end if;
  return job;
end;
$$;
