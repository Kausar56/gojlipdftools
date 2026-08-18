-- Moderator access schema. Run this once in the Supabase SQL Editor
-- (Project -> SQL Editor -> New query -> paste -> Run).
--
-- A moderator is a regular signed-up user (auth.users) that a real admin
-- (see lib/adminAuth.ts — a fixed ADMIN_EMAILS allowlist, not a table) has
-- granted a specific subset of admin-adjacent permissions to. Writes only
-- ever happen through the service-role client (admin Server Actions under
-- app/admin/moderators), which bypasses RLS entirely — the only policy
-- needed here is a moderator reading their own row.

create table if not exists public.moderators (
  id uuid primary key references auth.users(id) on delete cascade,
  -- e.g. {"blog:create","blog:edit_own","blog:delete_own"} — see
  -- lib/permissions.ts for the full recognized set.
  permissions text[] not null default '{}',
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent so re-running this file after the table already exists (e.g. an
-- earlier version without this column) still picks it up. This is a label on
-- top of `permissions`, not a separate authorization path — see
-- lib/permissions.ts's MODERATOR_ROLE_PRESETS/hasPermission for how it's
-- used. Existing rows default to 'moderator', the only kind of grant before
-- Admin/Support existed.
alter table public.moderators add column if not exists role text not null default 'moderator';
alter table public.moderators drop constraint if exists moderators_role_check;
alter table public.moderators add constraint moderators_role_check
  check (role in ('admin', 'moderator', 'support'));

alter table public.moderators enable row level security;

-- Postgres has no "create policy if not exists", so drop-then-create to keep
-- this file safely re-runnable.
drop policy if exists "Moderators can read their own row" on public.moderators;
create policy "Moderators can read their own row"
  on public.moderators for select
  using (auth.uid() = id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists moderators_set_updated_at on public.moderators;
create trigger moderators_set_updated_at
  before update on public.moderators
  for each row execute function public.set_updated_at();
