-- Call recording + post-call transcription fields
-- Run in Supabase SQL Editor after dialer.sql

alter table public.call_logs
  add column if not exists recording_path text,
  add column if not exists recording_mime_type text,
  add column if not exists recording_bytes integer,
  add column if not exists transcript text,
  add column if not exists transcription_status text,
  add column if not exists transcription_error text;

comment on column public.call_logs.transcription_status is
  'none | pending | processing | completed | failed';

-- Private storage bucket for call audio (uploaded via service role API)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'call-recordings',
  'call-recordings',
  false,
  52428800,
  array['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Users can read their own recordings if using client-side signed access later
drop policy if exists "Users read own call recordings" on storage.objects;
create policy "Users read own call recordings"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'call-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
