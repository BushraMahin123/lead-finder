-- Call minutes balance for dialer packages
-- Run in Supabase SQL Editor after billing.sql

create table if not exists public.user_call_minute_balances (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance numeric(12, 2) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.call_minute_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null,
  balance_after numeric(12, 2) not null,
  type text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  stripe_event_id text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create index if not exists call_minute_ledger_user_id_idx
  on public.call_minute_ledger (user_id, created_at desc);

alter table public.user_call_minute_balances enable row level security;
alter table public.call_minute_ledger enable row level security;

drop policy if exists "Users read own call minute balance" on public.user_call_minute_balances;
create policy "Users read own call minute balance"
  on public.user_call_minute_balances for select
  using (auth.uid() = user_id);

drop policy if exists "Users read own call minute ledger" on public.call_minute_ledger;
create policy "Users read own call minute ledger"
  on public.call_minute_ledger for select
  using (auth.uid() = user_id);

create or replace function public.apply_call_minute_change(
  p_user_id uuid,
  p_amount numeric,
  p_type text,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_idempotency_key text default null,
  p_stripe_event_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_new_balance numeric;
  v_ledger_id uuid;
  v_existing uuid;
begin
  if p_idempotency_key is not null then
    select id into v_existing
    from public.call_minute_ledger
    where idempotency_key = p_idempotency_key;

    if found then
      select balance into v_balance
      from public.user_call_minute_balances
      where user_id = p_user_id;

      return jsonb_build_object(
        'balance', coalesce(v_balance, 0),
        'ledger_id', v_existing,
        'duplicate', true
      );
    end if;
  end if;

  insert into public.user_call_minute_balances (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select balance into v_balance
  from public.user_call_minute_balances
  where user_id = p_user_id
  for update;

  v_new_balance := v_balance + p_amount;

  if v_new_balance < 0 then
    raise exception 'insufficient_call_minutes:%:%', v_balance, abs(p_amount);
  end if;

  update public.user_call_minute_balances
  set balance = v_new_balance, updated_at = now()
  where user_id = p_user_id;

  insert into public.call_minute_ledger (
    user_id,
    amount,
    balance_after,
    type,
    description,
    metadata,
    idempotency_key,
    stripe_event_id
  )
  values (
    p_user_id,
    p_amount,
    v_new_balance,
    p_type,
    p_description,
    p_metadata,
    p_idempotency_key,
    p_stripe_event_id
  )
  returning id into v_ledger_id;

  return jsonb_build_object(
    'balance', v_new_balance,
    'ledger_id', v_ledger_id,
    'duplicate', false
  );
end;
$$;

revoke all on function public.apply_call_minute_change from public;
grant execute on function public.apply_call_minute_change to service_role;
