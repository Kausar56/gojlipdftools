import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listTicketsForUser } from "@/lib/tickets";
import { UserTicketsList } from "@/components/UserTicketsList";
import { createTicket } from "./actions";

export const metadata: Metadata = { title: "Support Tickets" };
export const dynamic = "force-dynamic";

export default async function UserTicketsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?redirect=/dashboard/tickets");

  const tickets = await listTicketsForUser(data.user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <Link href="/dashboard" className="text-xs text-primary hover:underline">
        ← Back to dashboard
      </Link>
      <div className="mt-4">
        <UserTicketsList tickets={tickets} createAction={createTicket} />
      </div>
    </div>
  );
}
