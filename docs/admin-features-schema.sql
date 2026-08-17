-- Admin panel extras: audit log + site-wide settings. Run this once in the
-- Supabase SQL Editor (Project -> SQL Editor -> New query -> paste -> Run).

-- Every admin/moderator write (blog CRUD, moderator grants, user plan/ban/
-- delete, tool toggles, banner changes) records one row here — see
-- lib/auditLog.ts. Only ever written/read through the service-role client,
-- so RLS is enabled with zero policies (deny-by-default; nobody, including
-- the acting user themselves, can read this via the anon/authenticated key).
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

-- Small key/value store for site-wide config an admin can change at runtime
-- without a redeploy — currently "tool_status" (per-tool enable/disable +
-- message, see lib/appSettings.ts) and "banner" (the site-wide announcement).
-- Publicly readable (anon key) since tool pages and the banner render for
-- signed-out visitors too — only ever written through the service-role
-- client from admin Server Actions.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "Public can read app settings" on public.app_settings;
create policy "Public can read app settings"
  on public.app_settings for select
  using (true);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();
