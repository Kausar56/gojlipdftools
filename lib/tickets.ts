import { createAdminClient } from "./supabase/admin";
import type { ViewerAccess } from "./permissions";

// Deliberately NOT imported from lib/adminAuth.ts — that module pulls in
// lib/supabase/server.ts (next/headers), which breaks the moment this file
// (used for its shared types/constants by Client Components like
// TicketStatusSelect/AdminTicketsTable) gets bundled client-side. Same
// reasoning lib/permissions.ts documents for staying adminAuth-free.
// lib/permissions.ts itself is safe to import (no server-only deps by design).
function isTicketStaffAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

/** A real (env-listed) admin, or a moderator explicitly granted the "admin"
 *  role, can see and act on every ticket. Anyone else with "tickets:manage"
 *  (a "moderator" or "support" role grant) only sees tickets assigned to
 *  them — see listTicketsForAdmin/getTicketForAdmin below. */
export function isTicketFullAccess(access: ViewerAccess): boolean {
  if (access.kind === "admin") return true;
  return access.kind === "moderator" && access.role === "admin";
}

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketCategory = "pdf_tool" | "account" | "payment" | "bug" | "security" | "other";
export type TicketPriority = "low" | "normal" | "high";

export type Ticket = {
  id: string;
  ticketNumber: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  userAvatarUrl: string | null;
  subject: string;
  status: TicketStatus;
  // Admin-only escalation on top of `status === "closed"` — see
  // docs/tickets-schema.sql's comment. When true, the user can no longer
  // reopen this ticket (see reopenTicketAsUser) and is pointed at opening a
  // new one instead.
  locked: boolean;
  category: TicketCategory | null;
  priority: TicketPriority;
  assignedToId: string | null;
  assignedToEmail: string | null;
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
  // Raw Cloudinary reference, not a URL — the attachment was uploaded as a
  // private ("authenticated") asset, so there is no plain link to hand to
  // the client. A signed, time-scoped delivery URL is minted from these on
  // the two Server Component pages that render a thread (see
  // getAttachmentDeliveryUrl in lib/cloudinary.ts), which by that point have
  // already verified the viewer is allowed to see this ticket — never here,
  // so this file (pulled into Client Components for its shared types) never
  // needs to import the Cloudinary SDK.
  attachmentPublicId: string | null;
  attachmentResourceType: string | null;
  attachmentName: string | null;
  // Set once the *other* side has viewed the ticket — see markMessagesRead.
  // Only meaningful for the sender's own view (rendered as "Seen" under
  // their own messages in components/TicketThread.tsx); irrelevant for a
  // message you received.
  readAt: string | null;
  createdAt: string;
};

export type TicketNote = {
  id: string;
  ticketId: string;
  authorId: string | null;
  authorEmail: string | null;
  body: string;
  createdAt: string;
};

export type AssignableStaff = { id: string; email: string; label: string };

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

export const TICKET_CATEGORIES: TicketCategory[] = ["pdf_tool", "account", "payment", "bug", "security", "other"];

export function isTicketCategory(value: string): value is TicketCategory {
  return (TICKET_CATEGORIES as string[]).includes(value);
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  pdf_tool: "PDF Tool",
  account: "Account",
  payment: "Payment",
  bug: "Bug",
  security: "Security",
  other: "Other",
};

export const TICKET_PRIORITIES: TicketPriority[] = ["low", "normal", "high"];

export function isTicketPriority(value: string): value is TicketPriority {
  return (TICKET_PRIORITIES as string[]).includes(value);
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

export const TICKET_PRIORITY_BADGE_CLASS: Record<TicketPriority, string> = {
  low: "badge-ghost",
  normal: "badge-info",
  high: "badge-error",
};

// Enforced twice: this list drives the file picker's `accept` attribute
// client-side, and the exact same list is signed into the Cloudinary upload
// request server-side (see app/api/tickets/upload-signature) — so a
// tampered request outside the file picker still gets rejected, not just
// hidden from the UI.
export const TICKET_ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
export const TICKET_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/** "GOJ-1001" — the human-readable id shown in the UI, backed by the
 *  `seq` bigserial column so it's short and ordered instead of a uuid
 *  fragment. Offset by 1000 so the first ticket doesn't read "GOJ-1". */
export function formatTicketNumber(seq: number): string {
  return `GOJ-${1000 + seq}`;
}

type UserInfo = { email: string; name: string | null; avatarUrl: string | null };

function buildUserInfoMap(users: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }[]) {
  return new Map<string, UserInfo>(
    users.map((user) => [
      user.id,
      {
        email: user.email ?? "(no email)",
        name: (user.user_metadata?.full_name as string | undefined) ?? null,
        // Populated automatically for Google-sign-in accounts; null for
        // email/password signups, which fall back to an initials avatar in
        // the UI (see components/UserAvatar.tsx).
        avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      },
    ]),
  );
}

function toTicket(row: Record<string, unknown>, userInfoById: Map<string, UserInfo>): Ticket {
  const userId = row.user_id as string;
  const assignedToId = (row.assigned_to as string | null) ?? null;
  const userInfo = userInfoById.get(userId);
  return {
    id: row.id as string,
    ticketNumber: formatTicketNumber(Number(row.seq)),
    userId,
    userEmail: userInfo?.email ?? null,
    userName: userInfo?.name ?? null,
    userAvatarUrl: userInfo?.avatarUrl ?? null,
    subject: row.subject as string,
    status: row.status as TicketStatus,
    locked: Boolean(row.locked),
    category: (row.category as TicketCategory | null) ?? null,
    priority: (row.priority as TicketPriority) ?? "normal",
    assignedToId,
    assignedToEmail: assignedToId ? (userInfoById.get(assignedToId)?.email ?? null) : null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toMessage(row: Record<string, unknown>, userInfoById: Map<string, UserInfo>): TicketMessage {
  const senderId = row.sender_id as string | null;
  return {
    id: row.id as string,
    ticketId: row.ticket_id as string,
    senderId,
    senderRole: row.sender_role as "user" | "staff",
    senderEmail: senderId ? (userInfoById.get(senderId)?.email ?? null) : null,
    body: row.body as string,
    attachmentPublicId: (row.attachment_public_id as string | null) ?? null,
    attachmentResourceType: (row.attachment_resource_type as string | null) ?? null,
    attachmentName: (row.attachment_name as string | null) ?? null,
    readAt: (row.read_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

const TICKET_COLUMNS = "id, seq, user_id, subject, status, locked, category, priority, assigned_to, created_at, updated_at";

/** A user's own tickets, most recently updated first — used by
 *  /dashboard/tickets. Doesn't need identity resolution (it's always their
 *  own, and staff identity is never shown to a user — see getTicketForUser),
 *  so this skips the auth admin API round-trip listTicketsForAdmin needs. */
export async function listTicketsForUser(userId: string): Promise<Ticket[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tickets")
    .select(TICKET_COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  return (data ?? []).map((row) => toTicket(row, new Map()));
}

/** Every ticket a given staff member is allowed to see, most recently
 *  updated first — admin-only (see app/admin/tickets). A real admin or a
 *  moderator granted the "admin" role sees everything; anyone else with
 *  "tickets:manage" only sees tickets assigned to them (see
 *  isTicketFullAccess). Resolves each ticket's owner (name/email/avatar) and
 *  assignee via the auth admin API, same approach as
 *  lib/moderators.ts's listModerators. */
export async function listTicketsForAdmin(access: ViewerAccess): Promise<Ticket[]> {
  const admin = createAdminClient();
  let query = admin.from("tickets").select(TICKET_COLUMNS).order("updated_at", { ascending: false });
  if (!isTicketFullAccess(access) && access.kind === "moderator") {
    query = query.eq("assigned_to", access.userId);
  }

  const [{ data: rows }, { data: usersData }] = await Promise.all([
    query,
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const userInfoById = buildUserInfoMap(usersData?.users ?? []);
  return (rows ?? []).map((row) => toTicket(row, userInfoById));
}

async function fetchMessages(ticketId: string, userInfoById: Map<string, UserInfo>): Promise<TicketMessage[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ticket_messages")
    .select(
      "id, ticket_id, sender_id, sender_role, body, attachment_public_id, attachment_resource_type, attachment_name, read_at, created_at",
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => toMessage(row, userInfoById));
}

/** Marks every message from the *other* side as read — called from
 *  getTicketForUser/getTicketForAdmin below, so simply viewing a ticket's
 *  thread is what produces the "Seen" indicator on the other party's
 *  messages, no separate mark-as-read action needed. */
async function markMessagesRead(ticketId: string, readerRole: "user" | "staff"): Promise<void> {
  const admin = createAdminClient();
  const senderRole = readerRole === "staff" ? "user" : "staff";
  await admin
    .from("ticket_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("ticket_id", ticketId)
    .eq("sender_role", senderRole)
    .is("read_at", null);
}

/** A single ticket + its full message thread, only if it belongs to
 *  `userId` — returns null both when the ticket doesn't exist and when it
 *  belongs to someone else, so a user can't tell the two apart by probing
 *  ids (see app/dashboard/tickets/[id]/page.tsx). */
export async function getTicketForUser(ticketId: string, userId: string): Promise<{ ticket: Ticket; messages: TicketMessage[] } | null> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("tickets")
    .select(TICKET_COLUMNS)
    .eq("id", ticketId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return null;

  // No identity resolution here on purpose — a user's own thread only ever
  // needs to distinguish "You" (sender_role "user") from "Gojli Support"
  // (sender_role "staff"), and shouldn't see which specific staff member —
  // or which staff email is currently assigned — replied.
  const ticket = toTicket(row, new Map());
  await markMessagesRead(ticketId, "user");
  const messages = await fetchMessages(ticketId, new Map());
  return { ticket, messages };
}

/** Same as getTicketForUser but for staff — resolves both the owner's and
 *  every staff reply's identity for display. Returns null (same
 *  can't-tell-the-difference-from-"doesn't exist" reasoning as
 *  getTicketForUser) if this ticket exists but the caller doesn't have full
 *  ticket access and it isn't assigned to them. */
export async function getTicketForAdmin(
  ticketId: string,
  access: ViewerAccess,
): Promise<{ ticket: Ticket; messages: TicketMessage[] } | null> {
  const admin = createAdminClient();
  const [{ data: row }, { data: usersData }] = await Promise.all([
    admin.from("tickets").select(TICKET_COLUMNS).eq("id", ticketId).maybeSingle(),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (!row) return null;
  if (!isTicketFullAccess(access) && access.kind === "moderator" && row.assigned_to !== access.userId) return null;

  const userInfoById = buildUserInfoMap(usersData?.users ?? []);
  const ticket = toTicket(row, userInfoById);
  await markMessagesRead(ticketId, "staff");
  const messages = await fetchMessages(ticketId, userInfoById);
  return { ticket, messages };
}

/** Every real admin (fixed ADMIN_EMAILS list) plus every moderator/support
 *  grant with the "tickets:manage" permission — the pool a ticket can be
 *  assigned to. Real admins have no row in `moderators`, so they're matched
 *  by email against ADMIN_EMAILS instead of by a granted permission. */
export async function listAssignableStaff(): Promise<AssignableStaff[]> {
  const admin = createAdminClient();
  const [{ data: usersData }, { data: moderatorRows }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("moderators").select("id, permissions"),
  ]);

  const ticketStaffIds = new Set(
    (moderatorRows ?? [])
      .filter((row) => ((row.permissions ?? []) as string[]).includes("tickets:manage"))
      .map((row) => row.id as string),
  );

  return (usersData?.users ?? [])
    .filter((user) => isTicketStaffAdminEmail(user.email) || ticketStaffIds.has(user.id))
    .map((user) => ({
      id: user.id,
      email: user.email ?? "(no email)",
      label: (user.user_metadata?.full_name as string | undefined) || user.email || "(no email)",
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Staff-only remarks on a ticket, oldest first — never surfaced to the
 *  ticket's owner (see docs/tickets-schema.sql's ticket_notes comment: this
 *  is a separate table specifically so the user-facing query path can never
 *  accidentally leak one). Only ever called from app/admin/tickets. */
export async function listNotesForTicket(ticketId: string): Promise<TicketNote[]> {
  const admin = createAdminClient();
  const [{ data: rows }, { data: usersData }] = await Promise.all([
    admin
      .from("ticket_notes")
      .select("id, ticket_id, author_id, body, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emailById = new Map((usersData?.users ?? []).map((user) => [user.id, user.email ?? "(no email)"]));
  return (rows ?? []).map((row) => ({
    id: row.id as string,
    ticketId: row.ticket_id as string,
    authorId: row.author_id as string | null,
    authorEmail: row.author_id ? (emailById.get(row.author_id as string) ?? null) : null,
    body: row.body as string,
    createdAt: row.created_at as string,
  }));
}
