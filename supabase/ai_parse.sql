-- AI parse cache, usage tracking, and Gemini circuit breaker state.
-- Run via: pnpm db:migrate:ai-parse

create table if not exists public.ai_parse_cache (
  cache_key text primary key,
  query text not null,
  filters jsonb not null,
  source text not null check (source in ('rules', 'gemini', 'fallback')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists ai_parse_cache_expires_at_idx
  on public.ai_parse_cache (expires_at);

create table if not exists public.ai_parse_requests (
  id bigserial primary key,
  user_id uuid not null,
  query_hash text not null,
  source text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_parse_requests_user_created_idx
  on public.ai_parse_requests (user_id, created_at desc);

create table if not exists public.ai_service_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
