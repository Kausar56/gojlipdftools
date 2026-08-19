import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentViewerAccess, hasPermission, getFallbackAdminPath } from "@/lib/adminAuth";
import { listTicketsForAdmin, isTicketFullAccess } from "@/lib/tickets";
import { AdminTicketsTable } from "@/components/AdminTicketsTable";

export const metadata: Metadata = { title: "Tickets" };
export const dynamic = "force-dynamic";

export default async function AdminTicketsPage() {
  const { access } = await getCurrentViewerAccess();
  if (!hasPermission(access, "tickets:manage")) redirect(getFallbackAdminPath(access));

  const tickets = await listTicketsForAdmin(access);
  const fullAccess = isTicketFullAccess(access);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-content">Tickets</h1>
      <p className="mt-1 text-sm text-base-content/60">
        {fullAccess ? `${tickets.length} support ticket(s) total.` : `${tickets.length} ticket(s) assigned to you.`}
      </p>

      <AdminTicketsTable tickets={tickets} />
    </div>
  );
}
