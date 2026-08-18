import { createAdminClient } from "./supabase/admin";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type Ticket = {
  id: string;
  userId: string;
  userEmail: string | null;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  senderId: string | null;
  senderRole: "user" | "staff";
  senderEmail: string | null;
  body: string;
  createdAt: string;
};

export const TICKET_STATUSES: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];

export function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as string[]).includes(value);
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

// Shared daisyUI badge color per status — used by both the user's own
// ticket list and the admin table so a status always looks the same
// regardless of which side is viewing it.
export const TICKET_STATUS_BADGE_CLASS: Record<TicketStatus, string> = {
  open: "badge-primary",
  in_progress: "badge-secondary",
  resolved: "badge-warning",
  closed: "badge-neutral",
};

function toTicket(row: Record<string, unknown>, emailById: Map<string, string>): Ticket {
  const userId = row.user_id as string;
  return {
    id: row.id as string,
    userId,
    userEmail: emailById.get(userId) ?? null,
    subject: row.subject as string,
    status: row.status as TicketStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toMessage(row: Record<string, unknown>, emailById: Map<string, string>): TicketMessage {
  const senderId = row.sender_id as string | null;
  return {
    id: row.id as string,
    ticketId: row.ticket_id as string,
    senderId,
    senderRole: row.sender_role as "user" | "staff",
    senderEmail: senderId ? (emailById.get(senderId) ?? null) : null,
    body: row.body as string,
    createdAt: row.created_at as string,
  };
}

/** A user's own tickets, most recently updated first — used by
 *  /dashboard/tickets. Doesn't need email resolution (it's always their
 *  own), so this skips the auth admin API round-trip listTicketsForAdmin
 *  needs. */
export async function listTicketsForUser(userId: string): Promise<Ticket[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tickets")
    .select("id, user_id, subject, status, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  return (data ?? []).map((row) => toTicket(row, new Map()));
}

/** Every ticket, most recently updated first — admin-only (see
 *  app/admin/tickets). Resolves each ticket's owner email via the auth admin
 *  API, same approach as lib/moderators.ts's listModerators. */
export async function listTicketsForAdmin(): Promise<Ticket[]> {
  const admin = createAdminClient();
  const [{ data: rows }, { data: usersData }] = await Promise.all([
    admin
      .from("tickets")
      .select("id, user_id, subject, status, created_at, updated_at")
      .order("updated_at", { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emailById = new Map((usersData?.users ?? []).map((user) => [user.id, user.email ?? "(no email)"]));
  return (rows ?? []).map((row) => toTicket(row, emailById));
}

async function fetchMessages(ticketId: string, emailById: Map<string, string>): Promise<TicketMessage[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ticket_messages")
    .select("id, ticket_id, sender_id, sender_role, body, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => toMessage(row, emailById));
}

/** A single ticket + its full message thread, only if it belongs to
 *  `userId` — returns null both when the ticket doesn't exist and when it
 *  belongs to someone else, so a user can't tell the two apart by probing
 *  ids (see app/dashboard/tickets/[id]/page.tsx). */
export async function getTicketForUser(ticketId: string, userId: string): Promise<{ ticket: Ticket; messages: TicketMessage[] } | null> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("tickets")
    .select("id, user_id, subject, status, created_at, updated_at")
    .eq("id", ticketId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return null;

  // No email resolution here on purpose — a user's own thread only ever
  // needs to distinguish "You" (sender_role "user") from "Support Team"
  // (sender_role "staff"), and shouldn't see which specific staff email
  // replied.
  const ticket = toTicket(row, new Map());
  const messages = await fetchMessages(ticketId, new Map());
  return { ticket, messages };
}

/** Same as getTicketForUser but for staff — any ticket, and both the owner's
 *  and every staff reply's email resolved for display. */
export async function getTicketForAdmin(ticketId: string): Promise<{ ticket: Ticket; messages: TicketMessage[] } | null> {
  const admin = createAdminClient();
  const [{ data: row }, { data: usersData }] = await Promise.all([
    admin
      .from("tickets")
      .select("id, user_id, subject, status, created_at, updated_at")
      .eq("id", ticketId)
      .maybeSingle(),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (!row) return null;

  const emailById = new Map((usersData?.users ?? []).map((user) => [user.id, user.email ?? "(no email)"]));
  const ticket = toTicket(row, emailById);
  const messages = await fetchMessages(ticketId, emailById);
  return { ticket, messages };
}
