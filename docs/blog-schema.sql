-- Blog feature schema. Run this once in the Supabase SQL Editor
-- (Project -> SQL Editor -> New query -> paste -> Run).
--
-- Writes only ever happen through the service-role client (admin Server
-- Actions), which bypasses RLS entirely — so the only policy needed here is
-- the public read of published posts. There is intentionally no INSERT/UPDATE
-- policy for anon/authenticated roles.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content_html text not null default '',
  thumbnail_url text,
  thumbnail_public_id text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  author_id uuid references auth.users(id) on delete set null,
  -- Denormalized at creation time from the admin's own account (full_name or
  -- email) so public reads never need the service-role auth admin API just
  -- to show a byline.
  author_name text,
  -- SEO overrides: fall back to `title`/`excerpt` when left blank. Kept
  -- separate so an admin can tune the search-result snippet without
  -- changing the on-page heading.
  meta_title text,
  meta_description text,
  tags text[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent so re-running this file after the table already exists (e.g. an
-- earlier version without these columns) still picks up the new columns.
alter table public.blog_posts add column if not exists author_name text;
alter table public.blog_posts add column if not exists meta_title text;
alter table public.blog_posts add column if not exists meta_description text;
alter table public.blog_posts add column if not exists tags text[] not null default '{}';

create index if not exists blog_posts_status_published_at_idx
  on public.blog_posts (status, published_at desc);

create index if not exists blog_posts_tags_idx
  on public.blog_posts using gin (tags);

alter table public.blog_posts enable row level security;

-- Postgres has no "create policy if not exists", so drop-then-create to keep
-- this file safely re-runnable.
drop policy if exists "Public can read published posts" on public.blog_posts;
create policy "Public can read published posts"
  on public.blog_posts for select
  using (status = 'published');

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();
