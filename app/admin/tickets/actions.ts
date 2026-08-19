"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentViewerAccess, hasPermission } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/auditLog";
import { isTicketStatus, isTicketCategory, isTicketPriority, isTicketFullAccess } from "@/lib/tickets";
import { sendEmail, ticketReplyEmail } from "@/lib/email";

async function requireTicketAccess() {
  const { user, access } = await getCurrentViewerAccess();
  if (!user || !hasPermission(access, "tickets:manage")) throw new Error("Not authorized.");
  return { staffUser: user, access };
}

/** Same access rule as lib/tickets.ts's getTicketForAdmin: full access (a
 *  real admin, or a moderator granted the "admin" role) can act on any
 *  ticket; anyone else with "tickets:manage" only on a ticket assigned to
 *  them. Every mutation below goes through this rather than just
 *  requireTicketAccess, so a Support agent can't act on someone else's
 *  ticket by guessing its id. */
async function requireAssignedTicket(ticketId: string) {
  const { staffUser, access } = await requireTicketAccess();
  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("tickets")
    .select("status, subject, user_id, assigned_to")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) throw new Error("Ticket not found.");
  if (!isTicketFullAccess(access) && ticket.assigned_to !== staffUser.id) {
    throw new Error("This ticket isn't assigned to you.");
  }
  return { staffUser, access, admin, ticket };
}

async function notifyUser(userId: string, subject: string, ticketId: string) {
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(userId);
    const to = data.user?.email;
    if (!to) return;
    const { subject: emailSubject, html } = ticketReplyEmail({
      subject,
      ticketUrl: `https://www.gojli.com/dashboard/tickets/${ticketId}`,
      fromLabel: "Gojli Support",
    });
    await sendEmail({ to, subject: emailSubject, html });
  } catch (error) {
    // A failed notification should never block the reply that triggered it.
    console.error("Failed to send user ticket notification:", error);
  }
}

function revalidateTicketPaths(ticketId: string) {
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
}

export async function replyToTicketAsStaff(ticketId: string, formData: FormData) {
  const { staffUser, admin, ticket } = await requireAssignedTicket(ticketId);
  const body = String(formData.get("body") ?? "").trim();
  const attachmentPublicId = String(formData.get("attachmentPublicId") ?? "").trim() || null;
  const attachmentResourceType = String(formData.get("attachmentResourceType") ?? "").trim() || null;
  const attachmentName = String(formData.get("attachmentName") ?? "").trim() || null;
  if (!body) throw new Error("Type a message first.");
  // A closed ticket is frozen for everyone — reopen it via the status
  // dropdown first (see TicketStatusSelect) rather than replying into it.
  if (ticket.status === "closed") throw new Error("This ticket is closed. Reopen it first to add a reply.");

  const { error } = await admin.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_id: staffUser.id,
    sender_role: "staff",
    body,
    attachment_public_id: attachmentPublicId,
    attachment_resource_type: attachmentResourceType,
    attachment_name: attachmentName,
  });
  if (error) throw new Error(error.message);

  // Touch updated_at (via the set_updated_at trigger) so this ticket sorts
  // back to the top of both lists — status is deliberately untouched here,
  // a reply alone doesn't change it; see updateTicketStatus for that.
  await admin.from("tickets").update({ status: ticket.status }).eq("id", ticketId);

  await notifyUser(ticket.user_id as string, ticket.subject as string, ticketId);

  await logAdminAction({
    actorId: staffUser.id,
    actorEmail: staffUser.email,
    action: "ticket.reply",
    targetType: "ticket",
    targetId: ticketId,
  });

  revalidateTicketPaths(ticketId);
}

export async function updateTicketStatus(ticketId: string, formData: FormData) {
  const { staffUser, admin } = await requireAssignedTicket(ticketId);
  const statusValue = String(formData.get("status") ?? "");
  if (!isTicketStatus(statusValue)) throw new Error("Invalid status.");

  const { error } = await admin.from("tickets").update({ status: statusValue }).eq("id", ticketId);
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: staffUser.id,
    actorEmail: staffUser.email,
    action: "ticket.status_change",
    targetType: "ticket",
    targetId: ticketId,
    details: { status: statusValue },
  });

  revalidateTicketPaths(ticketId);
}

export async function updateTicketCategory(ticketId: string, formData: FormData) {
  const { staffUser, admin } = await requireAssignedTicket(ticketId);
  const categoryValue = String(formData.get("category") ?? "");
  const category = isTicketCategory(categoryValue) ? categoryValue : null;

  const { error } = await admin.from("tickets").update({ category }).eq("id", ticketId);
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: staffUser.id,
    actorEmail: staffUser.email,
    action: "ticket.category_change",
    targetType: "ticket",
    targetId: ticketId,
    details: { category },
  });

  revalidateTicketPaths(ticketId);
}

// Priority, like assignment, is Admin-only — a Support grant's list is
// view/reply/status/internal-note on their assigned tickets, priority isn't
// in it (see the "Admin: ... priority manage" vs "Support: ... status"
// distinction this was built from).
export async function updateTicketPriority(ticketId: string, formData: FormData) {
  const { staffUser, access, admin } = await requireAssignedTicket(ticketId);
  if (!isTicketFullAccess(access)) throw new Error("Only an admin can change ticket priority.");
  const priorityValue = String(formData.get("priority") ?? "");
  if (!isTicketPriority(priorityValue)) throw new Error("Invalid priority.");

  const { error } = await admin.from("tickets").update({ priority: priorityValue }).eq("id", ticketId);
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: staffUser.id,
    actorEmail: staffUser.email,
    action: "ticket.priority_change",
    targetType: "ticket",
    targetId: ticketId,
    details: { priority: priorityValue },
  });

  revalidateTicketPaths(ticketId);
}

// Assignment is Admin-only (a real admin, or a moderator granted the "admin"
// role) — a Support/Moderator grant can't hand a ticket to themselves or
// anyone else, only Admin decides who's working what (see the module doc on
// requireAssignedTicket / lib/tickets.ts's isTicketFullAccess).
export async function assignTicket(ticketId: string, formData: FormData) {
  const { staffUser, access } = await requireTicketAccess();
  if (!isTicketFullAccess(access)) throw new Error("Only an admin can assign tickets.");
  const assigneeId = String(formData.get("assigneeId") ?? "").trim() || null;

  const admin = createAdminClient();
  const { error } = await admin.from("tickets").update({ assigned_to: assigneeId }).eq("id", ticketId);
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: staffUser.id,
    actorEmail: staffUser.email,
    action: "ticket.assign",
    targetType: "ticket",
    targetId: ticketId,
    details: { assigneeId },
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
}

export async function addInternalNote(ticketId: string, formData: FormData) {
  const { staffUser, admin } = await requireAssignedTicket(ticketId);
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Type a note first.");

  const { error } = await admin.from("ticket_notes").insert({ ticket_id: ticketId, author_id: staffUser.id, body });
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: staffUser.id,
    actorEmail: staffUser.email,
    action: "ticket.note",
    targetType: "ticket",
    targetId: ticketId,
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
}
