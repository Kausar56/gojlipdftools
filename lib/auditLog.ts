import { createAdminClient } from "./supabase/admin";

export type AuditEntry = {
  id: string;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

/** Records one admin/moderator action — every mutation under /admin (blog
 *  CRUD, moderator grants, user plan/ban/delete, tool toggles, banner edits)
 *  calls this right after the write succeeds. Best-effort: a logging failure
 *  should never roll back or block the action it's describing, so callers
 *  fire this without awaiting a thrown error back up. */
export async function logAdminAction(entry: {
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("admin_audit_log").insert({
      actor_id: entry.actorId,
      actor_email: entry.actorEmail,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      details: entry.details ?? null,
    });
  } catch (error) {
    console.error("Failed to write admin audit log entry:", error);
  }
}

/** Admin-only — most recent entries first, capped since this is a simple
 *  activity feed rather than a fully paginated log viewer. */
export async function getRecentAuditLog(limit = 200): Promise<AuditEntry[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_audit_log")
    .select("id, actor_email, action, target_type, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    actorEmail: row.actor_email as string | null,
    action: row.action as string,
    targetType: row.target_type as string | null,
    targetId: row.target_id as string | null,
    details: (row.details as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at as string,
  }));
}
