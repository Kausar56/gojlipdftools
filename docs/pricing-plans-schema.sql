-- Admin-editable pricing plans shown on /pricing (components/PricingSection.tsx)
-- — replaces the previously hardcoded plans array so an admin can add,
-- remove, or edit a plan's price/features without a code deploy. Run this
-- once in the Supabase SQL Editor. Safe to re-run.
--
-- Each row also carries its Paddle price IDs (monthly_price_id/
-- yearly_price_id) — these must point at REAL prices in your Paddle
-- catalog matching monthly_price/yearly_price, or checkout will charge a
-- different amount than what's shown on the page. See
-- docs/PADDLE_INTEGRATION.md.
--
-- Publicly readable (anon key) since /pricing renders for signed-out
-- visitors too — only ever written through the service-role client from
-- admin Server Actions (app/admin/pricing/actions.ts).

create table if not exists public.pricing_plans (
  -- Slug-like id, e.g. "free"/"pro"/"business" — "free" is special-cased in
  -- the UI (no checkout button, just a link) whenever both price ids are
  -- null; anything else with null price ids is treated the same way, so a
  -- new free-tier plan needs no other special handling.
  id text primary key,
  name text not null,
  tagline text not null default '',
  monthly_price numeric not null default 0,
  yearly_price numeric not null default 0,
  -- Paddle Catalog -> Products -> (price) -> price ID (starts pri_). Null
  -- for a plan with no checkout (e.g. Free) — see id's comment above.
  monthly_price_id text,
  yearly_price_id text,
  cta text not null default 'Get Started',
  -- Link target for a no-checkout plan (e.g. "/#tools"). Ignored once
  -- monthly_price_id/yearly_price_id are set.
  href text,
  highlighted boolean not null default false,
  -- Lower sorts first; ties broken by id. Give each plan values with gaps
  -- (10, 20, 30, ...) so inserting a new plan between two existing ones
  -- never requires renumbering the others.
  display_order integer not null default 0,
  -- Array of {text: string, icon?: string}. icon is a components/icons.tsx
  -- name (e.g. "sparkle" to highlight an AI feature) — omitted/null uses
  -- the default checkmark.
  features jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.pricing_plans enable row level security;

drop policy if exists "Public can read pricing plans" on public.pricing_plans;
create policy "Public can read pricing plans"
  on public.pricing_plans for select
  using (true);

-- Same helper docs/tool-content-schema.sql defines — re-declared here
-- (identical body, safe to run either order) so this file works standalone.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists pricing_plans_set_updated_at on public.pricing_plans;
create trigger pricing_plans_set_updated_at
  before update on public.pricing_plans
  for each row execute function public.set_updated_at();

-- One-time seed — mirrors whatever was hardcoded in components/
-- PricingSection.tsx immediately before this migration, so publishing this
-- table doesn't change anything on the live site. Uses the *existing*
-- (pre-halving) Paddle price IDs, since those are the only ones that
-- actually exist in the Paddle catalog right now — edit monthly_price_id/
-- yearly_price_id here (or via /admin/pricing) once matching new prices
-- are created in Paddle at the new amounts.
insert into public.pricing_plans (id, name, tagline, monthly_price, yearly_price, monthly_price_id, yearly_price_id, cta, href, highlighted, display_order, features)
values
  (
    'free', 'Free', 'For everyday PDF tasks', 0, 0, null, null, 'Get Started', '/#tools', false, 10,
    '[
      {"text": "Unlimited use of all core PDF tools"},
      {"text": "Merge, split, compress, rotate, watermark"},
      {"text": "Password protect and unlock PDFs"},
      {"text": "Files up to 25 MB"},
      {"text": "AI Summarize — 10 questions/month", "icon": "sparkle"},
      {"text": "No account required"}
    ]'::jsonb
  ),
  (
    'pro', 'Pro', 'For frequent, heavier workloads', 4.5, 45, 'pri_01m1hpd5scsnp69fyk98rx87ec', 'pri_01m1pj3nm9nn45hzx21krefv7r', 'Upgrade to Pro', null, true, 20,
    '[
      {"text": "Everything in Free"},
      {"text": "Files up to 200 MB"},
      {"text": "Word, Excel, and PowerPoint conversions"},
      {"text": "AI Summarize — 200 questions/month", "icon": "sparkle"},
      {"text": "Batch processing for multiple files"},
      {"text": "Priority processing"},
      {"text": "Email support"}
    ]'::jsonb
  ),
  (
    'business', 'Business', 'For teams and organizations', 14.5, 145, 'pri_01m1pj6ahtj6hz8a7ma9cht06p', 'pri_01m1pj7489ht6nwea32vckb97t', 'Upgrade to Business', null, false, 30,
    '[
      {"text": "Everything in Pro"},
      {"text": "AI Summarize — unlimited questions", "icon": "sparkle"},
      {"text": "Up to 10 team members"},
      {"text": "Files up to 1 GB"},
      {"text": "Custom watermark branding"},
      {"text": "Priority phone and email support"},
      {"text": "Usage analytics dashboard"}
    ]'::jsonb
  )
on conflict (id) do nothing;
