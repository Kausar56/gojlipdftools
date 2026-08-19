"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { sendEmail, newTicketEmail } from "@/lib/email";
import { isTicketCategory } from "@/lib/tickets";

async function requireUser() {
  const { user } = await getCurrentViewerAccess();
  if (!user) throw new Error("You need to be signed in to do this.");
  return user;
}

// Where a brand-new ticket (and a user's reply, if no one is assigned yet) is
// announced — set SUPPORT_NOTIFICATION_EMAIL to a real inbox to enable this.
// Left unset, notifyStaff below just no-ops (see lib/email.ts).
function supportInboxEmail(): string | null {
  return process.env.SUPPORT_NOTIFICATION_EMAIL || null;
}

async function notifyStaff(to: string | null, subject: string, ticketId: string, userEmail: string) {
  if (!to) return;
  try {
    const { subject: emailSubject, html } = newTicketEmail({
      subject,
      ticketUrl: `https://www.gojli.com/admin/tickets/${ticketId}`,
      userEmail,
    });
    await sendEmail({ to, subject: emailSubject, html });
  } catch (error) {
    // A failed notification should never block the ticket action itself.
    console.error("Failed to send staff ticket notification:", error);
  }
}

export async function createTicket(formData: FormData) {
  const user = await requireUser();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const categoryValue = String(formData.get("category") ?? "");
  const category = isTicketCategory(categoryValue) ? categoryValue : null;
  const attachmentPublicId = String(formData.get("attachmentPublicId") ?? "").trim() || null;
  const attachmentResourceType = String(formData.get("attachmentResourceType") ?? "").trim() || null;
  const attachmentName = String(formData.get("attachmentName") ?? "").trim() || null;
  if (!subject) throw new Error("Please add a subject.");
  if (!message) throw new Error("Please describe your issue.");

  const admin = createAdminClient();
  const { data: ticket, error } = await admin
    .from("tickets")
    .insert({ user_id: user.id, subject, category })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: messageError } = await admin.from("ticket_messages").insert({
    ticket_id: ticket.id,
    sender_id: user.id,
    sender_role: "user",
    body: message,
    attachment_public_id: attachmentPublicId,
    attachment_resource_type: attachmentResourceType,
    attachment_name: attachmentName,
  });
  if (messageError) throw new Error(messageError.message);

  await notifyStaff(supportInboxEmail(), subject, ticket.id, user.email ?? "A user");

  revalidatePath("/dashboard/tickets");
  revalidatePath("/admin/tickets");
  redirect(`/dashboard/tickets/${ticket.id}`);
}

export async function replyToTicketAsUser(ticketId: string, formData: FormData) {
  const user = await requireUser();
  const body = String(formData.get("body") ?? "").trim();
  const attachmentPublicId = String(formData.get("attachmentPublicId") ?? "").trim() || null;
  const attachmentResourceType = String(formData.get("attachmentResourceType") ?? "").trim() || null;
  const attachmentName = String(formData.get("attachmentName") ?? "").trim() || null;
  if (!body) throw new Error("Type a message first.");

  const admin = createAdminClient();
  // Ownership check — a user can only reply to their own ticket.
  const { data: ticket } = await admin
    .from("tickets")
    .select("status, subject, assigned_to")
    .eq("id", ticketId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ticket) throw new Error("Ticket not found.");
  // A closed ticket is frozen — the user has to explicitly reopen it first
  // (see reopenTicketAsUser) rather than a reply silently reopening it.
  if (ticket.status === "closed") throw new Error("This ticket is closed. Reopen it first to add a reply.");

  const { error } = await admin.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_id: user.id,
    sender_role: "user",
    body,
    attachment_public_id: attachmentPublicId,
    attachment_resource_type: attachmentResourceType,
    attachment_name: attachmentName,
  });
  if (error) throw new Error(error.message);

  // Replying re-opens a resolved ticket so it lands back on staff's radar
  // instead of silently waiting. Setting status even when it's already
  // "open" is deliberate — it's the only way to also bump updated_at via
  // the set_updated_at trigger, so this ticket sorts back to the top of
  // both the user's and staff's lists.
  const nextStatus = ticket.status === "resolved" ? "open" : ticket.status;
  await admin.from("tickets").update({ status: nextStatus }).eq("id", ticketId);

  // Notify whoever is assigned, falling back to the general support inbox —
  // either way, a real person should hear about a user's reply.
  let assigneeEmail: string | null = null;
  if (ticket.assigned_to) {
    const { data: assignee } = await admin.auth.admin.getUserById(ticket.assigned_to as string);
    assigneeEmail = assignee.user?.email ?? null;
  }
  await notifyStaff(assigneeEmail ?? supportInboxEmail(), ticket.subject as string, ticketId, user.email ?? "A user");

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
}

export async function reopenTicketAsUser(ticketId: string) {
  const user = await requireUser();
  const admin = createAdminClient();
  // Ownership check — a user can only reopen their own ticket.
  const { data: ticket } = await admin
    .from("tickets")
    .select("status")
    .eq("id", ticketId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ticket) throw new Error("Ticket not found.");
  if (ticket.status !== "closed") return;

  const { error } = await admin.from("tickets").update({ status: "open" }).eq("id", ticketId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
}
