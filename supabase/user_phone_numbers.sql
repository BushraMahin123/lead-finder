-- Run in Supabase SQL Editor, or: pnpm db:migrate:user-phone-numbers
-- Stores Telnyx phone numbers purchased for users inside LEADMAGPRO.

create table if not exists public.user_phone_numbers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phone_number text not null,
  telnyx_number_id text,
  telnyx_order_id text,
  country_code text not null default 'US',
  status text not null default 'active',
  is_default boolean not null default false,
  monthly_cost numeric(10, 4),
  upfront_cost numeric(10, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, phone_number)
);

create index if not exists user_phone_numbers_user_id_idx
  on public.user_phone_numbers (user_id, created_at desc);

create unique index if not exists user_phone_numbers_one_default_per_user_idx
  on public.user_phone_numbers (user_id)
  where is_default = true and status = 'active';

alter table public.user_phone_numbers enable row level security;

drop policy if exists "Users read own phone numbers" on public.user_phone_numbers;
create policy "Users read own phone numbers"
  on public.user_phone_numbers for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own phone numbers" on public.user_phone_numbers;
create policy "Users insert own phone numbers"
  on public.user_phone_numbers for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own phone numbers" on public.user_phone_numbers;
create policy "Users update own phone numbers"
  on public.user_phone_numbers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
