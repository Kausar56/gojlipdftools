"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentViewerAccess } from "@/lib/adminAuth";

async function requireUser() {
  const { user } = await getCurrentViewerAccess();
  if (!user) throw new Error("You need to be signed in to do this.");
  return user;
}

export async function createTicket(formData: FormData) {
  const user = await requireUser();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!subject) throw new Error("Please add a subject.");
  if (!message) throw new Error("Please describe your issue.");

  const admin = createAdminClient();
  const { data: ticket, error } = await admin.from("tickets").insert({ user_id: user.id, subject }).select("id").single();
  if (error) throw new Error(error.message);

  const { error: messageError } = await admin
    .from("ticket_messages")
    .insert({ ticket_id: ticket.id, sender_id: user.id, sender_role: "user", body: message });
  if (messageError) throw new Error(messageError.message);

  revalidatePath("/dashboard/tickets");
  redirect(`/dashboard/tickets/${ticket.id}`);
}

export async function replyToTicketAsUser(ticketId: string, formData: FormData) {
  const user = await requireUser();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Type a message first.");

  const admin = createAdminClient();
  // Ownership check — a user can only reply to their own ticket.
  const { data: ticket } = await admin.from("tickets").select("status").eq("id", ticketId).eq("user_id", user.id).maybeSingle();
  if (!ticket) throw new Error("Ticket not found.");

  const { error } = await admin
    .from("ticket_messages")
    .insert({ ticket_id: ticketId, sender_id: user.id, sender_role: "user", body });
  if (error) throw new Error(error.message);

  // Replying re-opens a resolved/closed ticket so it lands back on staff's
  // radar instead of silently waiting. Setting status even when it's
  // already "open" is deliberate — it's the only way to also bump
  // updated_at via the set_updated_at trigger, so this ticket sorts back to
  // the top of both the user's and staff's lists.
  const nextStatus = ticket.status === "resolved" || ticket.status === "closed" ? "open" : ticket.status;
  await admin.from("tickets").update({ status: nextStatus }).eq("id", ticketId);

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
}
