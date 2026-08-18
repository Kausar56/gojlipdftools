import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTicketForUser, TICKET_STATUS_LABELS } from "@/lib/tickets";
import { TicketThread } from "@/components/TicketThread";
import { replyToTicketAsUser } from "../actions";

export const metadata: Metadata = { title: "Ticket" };
export const dynamic = "force-dynamic";

export default async function UserTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?redirect=/dashboard/tickets/${id}`);

  const result = await getTicketForUser(id, data.user.id);
  if (!result) notFound();
  const { ticket, messages } = result;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <Link href="/dashboard/tickets" className="text-xs text-primary hover:underline">
        ← Back to your tickets
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-base-content">{ticket.subject}</h1>
        <span className="badge badge-sm">{TICKET_STATUS_LABELS[ticket.status]}</span>
      </div>

      <div className="mt-6">
        <TicketThread messages={messages} viewerRole="user" replyAction={replyToTicketAsUser.bind(null, id)} />
      </div>
    </div>
  );
}
