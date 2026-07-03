-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  contact_count integer not null default 0,
  search_total integer not null default 0,
  ai_query text,
  search_filters jsonb not null default '{}'::jsonb,
  enrich_email boolean not null default false,
  enrich_phone boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_user_id_idx
  on public.campaigns (user_id, updated_at desc);

create table if not exists public.campaign_contacts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  person_id text not null,
  person_data jsonb not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (campaign_id, person_id)
);

create index if not exists campaign_contacts_campaign_id_idx
  on public.campaign_contacts (campaign_id, sort_order);

alter table public.campaigns enable row level security;
alter table public.campaign_contacts enable row level security;

create policy "Users read own campaigns"
  on public.campaigns for select
  using (auth.uid() = user_id);

create policy "Users insert own campaigns"
  on public.campaigns for insert
  with check (auth.uid() = user_id);

create policy "Users update own campaigns"
  on public.campaigns for update
  using (auth.uid() = user_id);

create policy "Users delete own campaigns"
  on public.campaigns for delete
  using (auth.uid() = user_id);

create policy "Users read own campaign contacts"
  on public.campaign_contacts for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_contacts.campaign_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users insert own campaign contacts"
  on public.campaign_contacts for insert
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_contacts.campaign_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users delete own campaign contacts"
  on public.campaign_contacts for delete
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_contacts.campaign_id
        and c.user_id = auth.uid()
    )
  );
