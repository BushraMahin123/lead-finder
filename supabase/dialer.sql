-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
-- Or: pnpm db:migrate supabase/dialer.sql
-- Softphone call logs for Telnyx WebRTC dialer.

create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  person_id text,
  person_name text,
  to_number text not null,
  from_number text,
  direction text not null default 'outbound',
  status text not null default 'initiated',
  disposition text,
  duration_seconds integer,
  telnyx_call_id text,
  error_message text,
  recording_path text,
  recording_mime_type text,
  recording_bytes integer,
  transcript text,
  transcription_status text,
  transcription_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists call_logs_user_id_created_at_idx
  on public.call_logs (user_id, created_at desc);

create index if not exists call_logs_campaign_person_idx
  on public.call_logs (campaign_id, person_id)
  where campaign_id is not null;

alter table public.call_logs enable row level security;

drop policy if exists "Users read own call logs" on public.call_logs;
create policy "Users read own call logs"
  on public.call_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own call logs" on public.call_logs;
create policy "Users insert own call logs"
  on public.call_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own call logs" on public.call_logs;
create policy "Users update own call logs"
  on public.call_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
