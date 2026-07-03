-- Run in Supabase SQL Editor

create table if not exists public.user_billing_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan_id text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  free_tokens_granted boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_token_balances (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance numeric(12, 2) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.token_ledger (
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

create index if not exists token_ledger_user_id_idx
  on public.token_ledger (user_id, created_at desc);

create index if not exists user_billing_accounts_stripe_customer_idx
  on public.user_billing_accounts (stripe_customer_id)
  where stripe_customer_id is not null;

alter table public.user_billing_accounts enable row level security;
alter table public.user_token_balances enable row level security;
alter table public.token_ledger enable row level security;

create policy "Users read own billing account"
  on public.user_billing_accounts for select
  using (auth.uid() = user_id);

create policy "Users read own token balance"
  on public.user_token_balances for select
  using (auth.uid() = user_id);

create policy "Users read own token ledger"
  on public.token_ledger for select
  using (auth.uid() = user_id);

create or replace function public.apply_token_change(
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
    from public.token_ledger
    where idempotency_key = p_idempotency_key;

    if found then
      select balance into v_balance
      from public.user_token_balances
      where user_id = p_user_id;

      return jsonb_build_object(
        'balance', coalesce(v_balance, 0),
        'ledger_id', v_existing,
        'duplicate', true
      );
    end if;
  end if;

  insert into public.user_token_balances (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select balance into v_balance
  from public.user_token_balances
  where user_id = p_user_id
  for update;

  v_new_balance := v_balance + p_amount;

  if v_new_balance < 0 then
    raise exception 'insufficient_tokens:%:%', v_balance, abs(p_amount);
  end if;

  update public.user_token_balances
  set balance = v_new_balance, updated_at = now()
  where user_id = p_user_id;

  insert into public.token_ledger (
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

create or replace function public.ensure_user_billing_account(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.user_billing_accounts%rowtype;
  v_result jsonb;
begin
  insert into public.user_billing_accounts (user_id, plan_id)
  values (p_user_id, 'free')
  on conflict (user_id) do nothing;

  insert into public.user_token_balances (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select * into v_account
  from public.user_billing_accounts
  where user_id = p_user_id
  for update;

  if not v_account.free_tokens_granted then
    v_result := public.apply_token_change(
      p_user_id,
      100,
      'free_signup_grant',
      'Free plan welcome tokens (one-time)',
      jsonb_build_object('plan_id', 'free'),
      'free_signup_grant:' || p_user_id::text,
      null
    );

    update public.user_billing_accounts
    set free_tokens_granted = true, updated_at = now()
    where user_id = p_user_id;

    return jsonb_build_object(
      'granted_free_tokens', true,
      'balance', (v_result->>'balance')::numeric
    );
  end if;

  return jsonb_build_object('granted_free_tokens', false);
end;
$$;

revoke all on function public.apply_token_change from public;
revoke all on function public.ensure_user_billing_account from public;
grant execute on function public.apply_token_change to service_role;
grant execute on function public.ensure_user_billing_account to service_role;
