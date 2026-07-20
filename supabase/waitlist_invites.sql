-- Track admin invites from the waitlist.
-- Run with: pnpm db:migrate:waitlist-invites

alter table public.waitlist_signups
  add column if not exists invited_at timestamptz,
  add column if not exists invited_user_id uuid references auth.users (id) on delete set null;

create index if not exists waitlist_signups_invited_at_idx
  on public.waitlist_signups (invited_at desc)
  where invited_at is not null;
