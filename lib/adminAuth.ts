import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import {
  type ViewerAccess,
  type ModeratorRole,
  isModeratorPermission,
  isModeratorRole,
  hasPermission,
  hasAnyBlogPermission,
} from "./permissions";

// Re-exported so existing call sites (`import { hasPermission, type
// ViewerAccess } from "@/lib/adminAuth"`) keep working — the canonical
// definitions live in lib/permissions.ts so Client Components (e.g.
// AdminSidebar) can import them without pulling in this file's server-only
// Supabase clients.
export { hasPermission, hasAnyBlogPermission, type ViewerAccess, type ModeratorRole };

/**
 * Admin access is intentionally NOT a database role or a `profiles` column —
 * it's a fixed list of emails from a server-only env var, so promoting or
 * revoking an admin is a config change (redeploy), not a data migration.
 * `ADMIN_EMAILS` must never be prefixed `NEXT_PUBLIC_` — it would otherwise
 * ship in the client bundle.
 */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

/**
 * A moderator is a regular signed-up user a real admin has granted a subset
 * of admin-adjacent permissions to (see the `moderators` table in
 * docs/moderators-schema.sql and lib/permissions.ts for the grantable set).
 * A real admin (see isAdminEmail above) always resolves as "admin" —
 * moderator rows are only ever consulted for everyone else.
 */
export async function resolveViewerAccess(
  user: { id: string; email?: string | null } | null,
): Promise<ViewerAccess> {
  if (!user) return { kind: "none" };
  if (isAdminEmail(user.email)) return { kind: "admin", userId: user.id, email: user.email ?? "" };

  const admin = createAdminClient();
  const { data } = await admin.from("moderators").select("permissions, role, disabled").eq("id", user.id).maybeSingle();
  if (!data) return { kind: "none" };
  // A disabled grant is treated exactly like no grant at all — the row and
  // its permissions/role stay saved in the DB so re-enabling restores them
  // as-is, but every hasPermission() check fails in the meantime. See
  // app/admin/moderators/actions.ts's disableTeamMember/enableTeamMember.
  if (data.disabled) return { kind: "none" };

  const permissions = ((data.permissions ?? []) as string[]).filter(isModeratorPermission);
  // Rows granted before the `role` column existed have no value here yet —
  // "moderator" was the only kind of grant back then, so that's the honest default.
  const roleValue = data.role as string | null;
  const role: ModeratorRole = roleValue && isModeratorRole(roleValue) ? roleValue : "moderator";
  return { kind: "moderator", userId: user.id, email: user.email ?? "", role, permissions };
}

/** The one place every admin page/Server Action gets "who is this and what
 *  can they do" from — wraps the getUser() + resolveViewerAccess() pair so
 *  that logic never has to be repeated at each call site. */
export async function getCurrentViewerAccess(): Promise<{
  user: { id: string; email: string | null; fullName: string | null } | null;
  access: ViewerAccess;
}> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user
    ? {
        id: data.user.id,
        email: data.user.email ?? null,
        fullName: (data.user.user_metadata?.full_name as string | undefined) ?? null,
      }
    : null;
  const access = await resolveViewerAccess(user);
  return { user, access };
}

/**
 * Where to send a viewer who just failed a specific admin page's permission
 * check. Every one of those pages used to hardcode `redirect("/admin/blog")`
 * as if every moderator was guaranteed to have some blog permission — once a
 * moderator could be granted e.g. only "stats:view" with no blog access at
 * all, that assumption broke: they'd bounce onto a blog page they also can't
 * see. Picking the first section this viewer actually has access to (falling
 * back to their regular user dashboard if they have none of these) keeps
 * every one of those redirects landing somewhere real instead of another
 * dead end.
 */
export function getFallbackAdminPath(access: ViewerAccess): string {
  if (hasPermission(access, "dashboard:view")) return "/admin";
  if (hasAnyBlogPermission(access)) return "/admin/blog";
  if (hasPermission(access, "stats:view")) return "/admin/stats";
  if (hasPermission(access, "tool_content:edit")) return "/admin/tool-content";
  if (access.kind === "admin") return "/admin";
  return "/dashboard";
}
