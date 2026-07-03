-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.search_cache (
  cache_key text primary key,
  filters jsonb not null default '{}'::jsonb,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists search_cache_expires_at_idx
  on public.search_cache (expires_at);

-- Optional: auto-delete expired rows (requires pg_cron on paid plans)
-- select cron.schedule(
--   'purge-search-cache',
--   '0 3 * * *',
--   $$ delete from public.search_cache where expires_at < now() $$
-- );
