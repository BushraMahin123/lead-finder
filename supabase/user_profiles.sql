-- Run in Supabase SQL Editor

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_name text not null,
  last_name text not null,
  company_name text not null,
  job_title text not null,
  company_size text not null,
  industry text not null,
  phone text,
  country text,
  use_case text not null,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_company_size_idx
  on public.user_profiles (company_size);

create index if not exists user_profiles_industry_idx
  on public.user_profiles (industry);

create index if not exists user_profiles_use_case_idx
  on public.user_profiles (use_case);

create index if not exists user_profiles_marketing_opt_in_idx
  on public.user_profiles (marketing_opt_in)
  where marketing_opt_in = true;

alter table public.user_profiles enable row level security;

drop policy if exists "Users read own profile" on public.user_profiles;
create policy "Users read own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users update own profile" on public.user_profiles;
create policy "Users update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
