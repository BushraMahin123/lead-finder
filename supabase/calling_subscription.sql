-- Separate calling subscription fields on billing accounts
-- (calling is monthly and must not overwrite lead-search plan subscription)

alter table public.user_billing_accounts
  add column if not exists calling_pack_id text,
  add column if not exists calling_stripe_subscription_id text,
  add column if not exists calling_subscription_status text;
