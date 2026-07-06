-- AI columns for campaign tables
-- Run via: pnpm db:migrate:campaign-columns

create table if not exists public.campaign_columns (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name text not null,
  prompt text not null,
  sort_order integer not null default 0,
  prompt_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaign_columns_campaign_id_idx
  on public.campaign_columns (campaign_id, sort_order);

create table if not exists public.campaign_column_values (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  column_id uuid not null references public.campaign_columns (id) on delete cascade,
  person_id text not null,
  value text,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'error')),
  error text,
  prompt_hash text not null,
  updated_at timestamptz not null default now(),
  unique (campaign_id, column_id, person_id)
);

create index if not exists campaign_column_values_lookup_idx
  on public.campaign_column_values (campaign_id, column_id);
