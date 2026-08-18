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
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent so re-running this file after the table already exists still
-- picks up any change to the allowed status set.
alter table public.tickets drop constraint if exists tickets_status_check;
alter table public.tickets add constraint tickets_status_check
  check (status in ('open', 'in_progress', 'resolved', 'closed'));

alter table public.tickets enable row level security;

create index if not exists tickets_user_id_idx on public.tickets (user_id);
create index if not exists tickets_status_updated_at_idx on public.tickets (status, updated_at desc);

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
-- reply after it, from either side.
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
  created_at timestamptz not null default now()
);

alter table public.ticket_messages enable row level security;

create index if not exists ticket_messages_ticket_id_idx on public.ticket_messages (ticket_id, created_at);
