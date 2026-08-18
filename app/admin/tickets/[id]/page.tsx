import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentViewerAccess, hasPermission, getFallbackAdminPath } from "@/lib/adminAuth";
import { getTicketForAdmin } from "@/lib/tickets";
import { TicketThread } from "@/components/TicketThread";
import { TicketStatusSelect } from "@/components/TicketStatusSelect";
import { replyToTicketAsStaff, updateTicketStatus } from "../actions";

export const metadata: Metadata = { title: "Ticket" };
export const dynamic = "force-dynamic";

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { access } = await getCurrentViewerAccess();
  if (!hasPermission(access, "tickets:manage")) redirect(getFallbackAdminPath(access));

  const result = await getTicketForAdmin(id);
  if (!result) notFound();
  const { ticket, messages } = result;

  return (
    <div>
      <Link href="/admin/tickets" className="text-xs text-primary hover:underline">
        ← Back to all tickets
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-base-content">{ticket.subject}</h1>
          <p className="text-xs text-base-content/50">{ticket.userEmail ?? "Unknown user"}</p>
        </div>
        <TicketStatusSelect status={ticket.status} updateAction={updateTicketStatus.bind(null, id)} />
      </div>

      <div className="mt-6 max-w-2xl">
        <TicketThread messages={messages} viewerRole="staff" replyAction={replyToTicketAsStaff.bind(null, id)} />
      </div>
    </div>
  );
}
