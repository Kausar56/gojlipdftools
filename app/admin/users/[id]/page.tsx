import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUserDetailForAdmin } from "@/lib/userAdmin";
import { getCurrentViewerAccess, hasPermission, getFallbackAdminPath } from "@/lib/adminAuth";
import { getToolBySlug } from "@/lib/tools";
import { TICKET_STATUS_LABELS, TICKET_STATUS_BADGE_CLASS } from "@/lib/tickets";
import { UserAvatar } from "@/components/UserAvatar";
import { UserPlanSelect } from "@/components/UserPlanSelect";
import { UserDetailActionsBar } from "@/components/UserDetailActionsBar";
import { UserActivityHistory } from "@/components/UserActivityHistory";
import { updateUserPlan, banUser, unbanUser, deleteUserAccount } from "../actions";

export const metadata: Metadata = { title: "User" };
export const dynamic = "force-dynamic";

function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card border border-base-300 bg-base-100 p-5">
      <h2 className="text-sm font-semibold text-base-content/80">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { access } = await getCurrentViewerAccess();
  const canManage = hasPermission(access, "users:manage");
  const canView = canManage || hasPermission(access, "users:view");
  if (!canView) redirect(getFallbackAdminPath(access));

  const detail = await getUserDetailForAdmin(id);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/users" className="text-xs text-primary hover:underline">
        ← Back to all users
      </Link>

      {/* Profile */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <UserAvatar name={detail.fullName} email={detail.email} avatarUrl={detail.avatarUrl} className="h-14 w-14" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-base-content">{detail.fullName || detail.email}</h1>
              <span className={`badge badge-sm ${detail.isBanned ? "badge-error" : "badge-ghost"}`}>
                {detail.isBanned ? "Suspended" : "Active"}
              </span>
            </div>
            {detail.fullName && <p className="text-sm text-base-content/60">{detail.email}</p>}
            <p className="mt-1 text-xs text-base-content/50">
              Joined {formatDateTime(detail.createdAt)} · Last login {formatDateTime(detail.lastSignInAt)}
            </p>
          </div>
        </div>
        {canManage && (
          <UserDetailActionsBar
            userId={detail.id}
            userEmail={detail.email}
            isBanned={detail.isBanned}
            banAction={banUser}
            unbanAction={unbanUser}
            deleteAction={deleteUserAccount}
          />
        )}
      </div>

      {/* Plan & Subscription */}
      <Section title="Plan & Subscription">
        {canManage ? (
          <UserPlanSelect userId={detail.id} userEmail={detail.email} plan={detail.plan} updatePlanAction={updateUserPlan} />
        ) : (
          <span className="badge badge-neutral badge-sm capitalize">{detail.plan}</span>
        )}
      </Section>

      {/* Tool Usage */}
      <Section title="Tool Usage">
        <p className="text-sm text-base-content/70">
          <span className="font-semibold text-base-content">{detail.toolUsage.totalConversions}</span> office
          conversions all-time (Word/Excel/PowerPoint ↔ PDF).
        </p>
        <p className="mt-1 text-xs text-base-content/40">
          Browser-only tools (merge, split, compress, edit, etc.) run entirely in the visitor&apos;s browser and are
          never recorded on the server, so they can&apos;t be shown here.
        </p>

        {detail.toolUsage.byTool.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {detail.toolUsage.byTool.map((entry) => (
              <span key={entry.toolSlug} className="badge badge-outline badge-sm">
                {getToolBySlug(entry.toolSlug)?.name ?? entry.toolSlug} × {entry.count}
              </span>
            ))}
          </div>
        )}

        {detail.toolUsage.recent.length > 0 && (
          <ul className="mt-4 divide-y divide-base-300 rounded-lg border border-base-300">
            {detail.toolUsage.recent.map((entry, index) => (
              <li key={index} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-base-content">{getToolBySlug(entry.toolSlug)?.name ?? entry.toolSlug}</span>
                <span className="text-xs text-base-content/50">{formatDateTime(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Support Tickets */}
      <Section title="Support Tickets">
        {detail.tickets.length === 0 ? (
          <p className="text-sm text-base-content/50">No tickets from this user.</p>
        ) : (
          <ul className="divide-y divide-base-300 rounded-lg border border-base-300">
            {detail.tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link href={`/admin/tickets/${ticket.id}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-base-200">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-base-content/40">{ticket.ticketNumber}</p>
                    <p className="truncate text-base-content">{ticket.subject}</p>
                  </div>
                  <span className={`badge badge-sm shrink-0 ${TICKET_STATUS_BADGE_CLASS[ticket.status]}`}>
                    {TICKET_STATUS_LABELS[ticket.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Activity History */}
      <Section title="Activity History">
        <UserActivityHistory entries={detail.activity} />
      </Section>
    </div>
  );
}
