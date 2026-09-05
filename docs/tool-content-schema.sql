-- Editable tool-page content (the "How this tool works" guide article + FAQ
-- section shown below every tool's workspace). Run this once in the
-- Supabase SQL Editor (Project -> SQL Editor -> New query -> paste -> Run).
--
-- A row here overrides the hardcoded defaults in lib/tools.ts for that one
-- tool slug — see lib/toolContent.ts for how the two are merged. No row (or
-- an all-null row) means the tool still shows its original hardcoded copy.
-- Publicly readable (anon key) since tool pages render for signed-out
-- visitors too — only ever written through the service-role client from
-- admin Server Actions.

create table if not exists public.tool_content (
  slug text primary key,
  -- Plain text — the "How {title} works" heading above the guide article,
  -- or null to fall back to "How {tool.name} works".
  guide_title text,
  -- Sanitized HTML (same allowlist as blog posts — see
  -- app/admin/tool-content/actions.ts) — one free-form article the admin
  -- writes in a single rich text editor, or null to fall back to
  -- lib/tools.ts's guideIntro/guideSteps.
  guide_html text,
  -- Array of {question: string, answer_html: string}, or null to fall back
  -- to lib/tools.ts's faqs.
  faqs jsonb,
  -- <title> tag content (before the root layout's "%s | Gojli" suffix is
  -- appended — do not include "| Gojli" here), or null to fall back to
  -- tool.name. Also used for openGraph/twitter title — see lib/seo.ts.
  seo_title text,
  -- <meta name="description">, or null to fall back to tool.heroDescription.
  -- Also used for openGraph/twitter description.
  seo_description text,
  -- The on-page <h1> above the workspace, or null to fall back to
  -- tool.name. Deliberately separate from seo_title — see lib/toolContent.ts.
  page_heading text,
  updated_at timestamptz not null default now()
);

-- Safe to re-run even if an earlier version of this schema (with separate
-- guide_intro_html/guide_steps columns, since replaced by the single
-- guide_html article field above) was already applied.
alter table public.tool_content add column if not exists guide_title text;
alter table public.tool_content add column if not exists guide_html text;
alter table public.tool_content add column if not exists seo_title text;
alter table public.tool_content add column if not exists seo_description text;
alter table public.tool_content add column if not exists page_heading text;
alter table public.tool_content drop column if exists guide_intro_html;
alter table public.tool_content drop column if exists guide_steps;

alter table public.tool_content enable row level security;

drop policy if exists "Public can read tool content" on public.tool_content;
create policy "Public can read tool content"
  on public.tool_content for select
  using (true);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tool_content_set_updated_at on public.tool_content;
create trigger tool_content_set_updated_at
  before update on public.tool_content
  for each row execute function public.set_updated_at();
