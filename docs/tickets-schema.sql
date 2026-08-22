-- Support ticket schema. Run this once in the Supabase SQL Editor
-- (Project -> SQL Editor -> New query -> paste -> Run).
--
-- A user opens a ticket from their dashboard; a staff member with the
-- "tickets:manage" permission (see lib/permissions.ts) handles it from
-- /admin/tickets. Both sides always go through Server Actions using the
-- service-role client (app/dashboard/tickets/actions.ts and
-- app/admin/tickets/actions.ts), which check ownership/permission in code —
-- same reasoning as admin_audit_log in docs/admin-features-schema.sql: RLS
-- is enabled with zero policies (deny-by-default via the anon/authenticated
-- key), since nothing ever reads or writes these tables except through the
-- service role.

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  -- Human-readable id (formatted "GOJ-1001" in app code, see lib/tickets.ts's
  -- formatTicketNumber) — a bigserial rather than deriving one from `id` so
  -- it's short and sequential instead of a uuid fragment.
  seq bigserial not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  category text check (category in ('pdf_tool', 'account', 'payment', 'bug', 'security', 'other')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent so re-running this file after the table already exists still
-- picks up any change to the allowed status set.
alter table public.tickets drop constraint if exists tickets_status_check;
alter table public.tickets add constraint tickets_status_check
  check (status in ('open', 'in_progress', 'resolved', 'closed'));

alter table public.tickets add column if not exists seq bigserial;
alter table public.tickets drop constraint if exists tickets_seq_key;
alter table public.tickets add constraint tickets_seq_key unique (seq);
alter table public.tickets add column if not exists category text;
alter table public.tickets drop constraint if exists tickets_category_check;
alter table public.tickets add constraint tickets_category_check
  check (category in ('pdf_tool', 'account', 'payment', 'bug', 'security', 'other'));
alter table public.tickets add column if not exists priority text not null default 'normal';
alter table public.tickets drop constraint if exists tickets_priority_check;
alter table public.tickets add constraint tickets_priority_check
  check (priority in ('low', 'normal', 'high'));

-- Which staff member (a real admin or a moderator/support grant — see
-- lib/moderators.ts) is handling this ticket. Nullable: "Unassigned" is the
-- default and a valid state, not an error. `on delete set null` rather than
-- cascade — removing someone's staff access shouldn't delete the ticket
-- they were working on, just un-assign it.
alter table public.tickets add column if not exists assigned_to uuid references auth.users(id) on delete set null;

-- A "closed" ticket can normally still be reopened by its owner (see
-- app/dashboard/tickets/actions.ts's reopenTicketAsUser) — `locked` is an
-- Admin-only escalation on top of that: once true, reopenTicketAsUser
-- refuses, and the user is pointed at opening a new ticket instead (see
-- app/admin/tickets/actions.ts's lockTicket/unlockTicket). Independent of
-- `status` rather than a 5th status value, since it's a permission flag
-- ("can this be reopened"), not a stage in the ticket's lifecycle.
alter table public.tickets add column if not exists locked boolean not null default false;

alter table public.tickets enable row level security;

create index if not exists tickets_user_id_idx on public.tickets (user_id);
create index if not exists tickets_status_updated_at_idx on public.tickets (status, updated_at desc);
create index if not exists tickets_assigned_to_idx on public.tickets (assigned_to);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

-- One row per message in a ticket's thread — the opening message and every
-- reply after it, from either side. Attachments are stored as an
-- authenticated (private) Cloudinary asset — public_id + resource_type, NOT
-- a permanent public URL — see lib/cloudinary.ts's getAttachmentDeliveryUrl,
-- which mints a signed delivery URL on read, only from the two
-- ownership/permission-gated code paths (getTicketForUser/getTicketForAdmin
-- in lib/tickets.ts). That's what keeps one user's attachment from being
-- reachable by guessing another user's link.
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  -- Denormalized rather than looked up from lib/moderators at read time —
  -- a staff member's role can change (or they can be removed) after they
  -- replied, but the thread should still show who was speaking as what at
  -- the time.
  sender_role text not null check (sender_role in ('user', 'staff')),
  body text not null,
  attachment_public_id text,
  attachment_resource_type text,
  attachment_name text,
  -- Set when the *other* side views the ticket (see lib/tickets.ts's
  -- markMessagesRead, called from getTicketForUser/getTicketForAdmin) — a
  -- message only ever has one recipient in a two-party thread, so a single
  -- timestamp is enough for a "Seen" indicator, no separate read-receipts
  -- table needed.
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Idempotent pickup for installs that ran an earlier version of this file
-- (which stored a plain public attachment_url instead).
alter table public.ticket_messages drop column if exists attachment_url;
alter table public.ticket_messages add column if not exists attachment_public_id text;
alter table public.ticket_messages add column if not exists attachment_resource_type text;
alter table public.ticket_messages add column if not exists attachment_name text;
alter table public.ticket_messages add column if not exists read_at timestamptz;

alter table public.ticket_messages enable row level security;

create index if not exists ticket_messages_ticket_id_idx on public.ticket_messages (ticket_id, created_at);

-- Staff-only remarks on a ticket — never surfaced to the ticket's owner (see
-- lib/tickets.ts's listNotesForTicket, only ever called from
-- app/admin/tickets, never from the user-facing app/dashboard/tickets code
-- path). A separate table rather than a flag on ticket_messages so a future
-- change to the user-facing query can never accidentally leak one by
-- forgetting to filter it out.
create table if not exists public.ticket_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.ticket_notes enable row level security;

create index if not exists ticket_notes_ticket_id_idx on public.ticket_notes (ticket_id, created_at);
