-- Admin-editable "Compare plans" table shown on /pricing, below the plan
-- cards (components/PricingTable.tsx). Separate from pricing_plans (docs/
-- pricing-plans-schema.sql) because a comparison row's cell values don't
-- fit that table's per-plan `features` list — a comparison row needs one
-- value *per plan*, and the set of plans is itself dynamic (an admin can
-- add/remove a plan at /admin/pricing). Run this once in the Supabase SQL
-- Editor. Safe to re-run.
--
-- Publicly readable (anon key) since /pricing renders for signed-out
-- visitors too — only ever written through the service-role client from
-- admin Server Actions (app/admin/pricing/actions.ts).

create table if not exists public.pricing_comparison_rows (
  id bigint generated always as identity primary key,
  -- Unique so the seed below can use ON CONFLICT to stay re-run-safe (an
  -- identity primary key can't be targeted directly, since new rows never
  -- specify their own id).
  feature text not null unique,
  -- Lower sorts first — same convention as pricing_plans.display_order.
  display_order integer not null default 0,
  -- Map of plan id (pricing_plans.id) -> cell value. A value is either
  -- `true`/`false` (renders a checkmark / a dash) or a string (rendered
  -- as-is, e.g. "200 MB"). A plan id with no key here renders as blank —
  -- expected right after a new plan is added, until its column is filled in.
  values jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.pricing_comparison_rows enable row level security;

drop policy if exists "Public can read pricing comparison rows" on public.pricing_comparison_rows;
create policy "Public can read pricing comparison rows"
  on public.pricing_comparison_rows for select
  using (true);

-- Same helper docs/tool-content-schema.sql and docs/pricing-plans-schema.sql
-- define — re-declared here (identical body) so this file works standalone.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists pricing_comparison_rows_set_updated_at on public.pricing_comparison_rows;
create trigger pricing_comparison_rows_set_updated_at
  before update on public.pricing_comparison_rows
  for each row execute function public.set_updated_at();

-- One-time seed — mirrors whatever was hardcoded in components/
-- PricingTable.tsx immediately before this migration, keyed by the plan ids
-- from docs/pricing-plans-schema.sql's own seed (free/pro/business).
insert into public.pricing_comparison_rows (feature, display_order, values)
values
  ('Core PDF tools (merge, split, compress, rotate, watermark)', 10, '{"free": true, "pro": true, "business": true}'::jsonb),
  ('Password protect and unlock', 20, '{"free": true, "pro": true, "business": true}'::jsonb),
  ('Max file size', 30, '{"free": "25 MB", "pro": "200 MB", "business": "1 GB"}'::jsonb),
  ('AI Summarize', 40, '{"free": "10 questions/mo", "pro": "200 questions/mo", "business": "Unlimited"}'::jsonb),
  ('Word, Excel, PowerPoint conversions', 50, '{"free": false, "pro": true, "business": true}'::jsonb),
  ('Batch processing', 60, '{"free": false, "pro": true, "business": true}'::jsonb),
  ('Priority processing', 70, '{"free": false, "pro": true, "business": true}'::jsonb),
  ('Team members', 80, '{"free": "1", "pro": "1", "business": "Up to 10"}'::jsonb),
  ('Support', 90, '{"free": "Community", "pro": "Email", "business": "Priority + phone"}'::jsonb),
  ('Custom watermark branding', 100, '{"free": false, "pro": false, "business": true}'::jsonb),
  ('Usage analytics dashboard', 110, '{"free": false, "pro": false, "business": true}'::jsonb)
on conflict (feature) do nothing;
