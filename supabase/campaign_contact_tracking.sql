-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
-- Adds Google Sheets-style row tracking to saved table contacts.

alter table public.campaign_contacts
  add column if not exists contact_status text not null default 'not_contacted',
  add column if not exists contact_notes text not null default '',
  add column if not exists row_color text,
  add column if not exists is_done boolean not null default false,
  add column if not exists contact_meta_updated_at timestamptz not null default now();

create policy "Users update own campaign contacts"
  on public.campaign_contacts for update
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_contacts.campaign_id
        and c.user_id = auth.uid()
    )
  );
