-- Profiles: one row per user, holds their subscription plan.
-- Plan is intentionally NOT client-editable (no update policy below) — for now,
-- change a user's plan from the Supabase Table Editor. A real admin panel or a
-- Stripe webhook can update this same column later; nothing else needs to change.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Auto-create a free-plan profile row whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any accounts created before this migration.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Conversion usage: one row per server-side conversion attempt (Word/Excel/PPT <->
-- PDF via CloudConvert — see docs/TOOLS_STATUS.md). Used to enforce the monthly quota
-- defined in lib/planLimits.ts. Recorded when a job is *started*, not on completion —
-- that keeps the free-tier cost cap honest even if a user retries a failed conversion.
create table if not exists public.conversion_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_slug text not null,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

alter table public.conversion_usage enable row level security;

create policy "Users can view their own usage"
  on public.conversion_usage for select
  using (auth.uid() = user_id);

create policy "Users can record their own usage"
  on public.conversion_usage for insert
  with check (auth.uid() = user_id);

create index if not exists conversion_usage_user_created_idx
  on public.conversion_usage (user_id, created_at desc);
