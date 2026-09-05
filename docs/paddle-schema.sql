-- Paddle Billing integration — adds subscription tracking columns to the
-- existing `profiles` table. Run this once against your Supabase project's
-- SQL editor. Safe to re-run (every clause is IF NOT EXISTS).
--
-- See docs/PADDLE_INTEGRATION.md for the full integration walkthrough.

alter table profiles
  add column if not exists paddle_customer_id text,
  add column if not exists paddle_subscription_id text,
  add column if not exists paddle_subscription_status text,
  add column if not exists plan_renews_at timestamptz,
  add column if not exists paddle_cancel_url text,
  add column if not exists paddle_update_payment_method_url text;

-- The webhook looks up a profile by subscription id on subscription.updated/
-- subscription.canceled events (see app/api/webhooks/paddle/route.ts).
create index if not exists profiles_paddle_subscription_id_idx
  on profiles (paddle_subscription_id);
