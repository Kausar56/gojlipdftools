"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentViewerAccess, hasPermission } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/auditLog";
import { isTicketStatus } from "@/lib/tickets";

async function requireTicketAccess() {
  const { user, access } = await getCurrentViewerAccess();
  if (!user || !hasPermission(access, "tickets:manage")) throw new Error("Not authorized.");
  return user;
}

export async function replyToTicketAsStaff(ticketId: string, formData: FormData) {
  const staffUser = await requireTicketAccess();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Type a message first.");

  const admin = createAdminClient();
  const { data: ticket } = await admin.from("tickets").select("status").eq("id", ticketId).maybeSingle();
  if (!ticket) throw new Error("Ticket not found.");

  const { error } = await admin
    .from("ticket_messages")
    .insert({ ticket_id: ticketId, sender_id: staffUser.id, sender_role: "staff", body });
  if (error) throw new Error(error.message);

  // Touch updated_at (via the set_updated_at trigger) so this ticket sorts
  // back to the top of both lists — status is deliberately untouched here,
  // a reply alone doesn't change it; see updateTicketStatus for that.
  await admin.from("tickets").update({ status: ticket.status }).eq("id", ticketId);

  await logAdminAction({
    actorId: staffUser.id,
    actorEmail: staffUser.email,
    action: "ticket.reply",
    targetType: "ticket",
    targetId: ticketId,
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
}

export async function updateTicketStatus(ticketId: string, formData: FormData) {
  const staffUser = await requireTicketAccess();
  const statusValue = String(formData.get("status") ?? "");
  if (!isTicketStatus(statusValue)) throw new Error("Invalid status.");

  const admin = createAdminClient();
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

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
}
