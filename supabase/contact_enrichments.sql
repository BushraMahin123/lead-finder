-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.contact_enrichments (
  person_id text primary key,
  linkedin_url text,
  email text,
  email_status text,
  phone_numbers jsonb not null default '[]'::jsonb,
  enriched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_enrichments_linkedin_url_idx
  on public.contact_enrichments (linkedin_url)
  where linkedin_url is not null;

create index if not exists contact_enrichments_updated_at_idx
  on public.contact_enrichments (updated_at desc);
