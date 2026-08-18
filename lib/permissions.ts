// The full set of grantable moderator permissions — an admin picks a subset
// of these when adding or editing a moderator (see app/admin/moderators).
// New permission keys can be appended here later without touching the
// grant/check plumbing in lib/adminAuth.ts.
export const MODERATOR_PERMISSIONS = [
  { key: "blog:create", label: "Create blog posts" },
  { key: "blog:edit_own", label: "Edit their own blog posts" },
  { key: "blog:delete_own", label: "Delete their own blog posts" },
  { key: "dashboard:view", label: "View the admin dashboard" },
  { key: "stats:view", label: "View site statistics" },
  { key: "tool_content:edit", label: "Edit tool guide/FAQ content" },
] as const;

export type ModeratorPermission = (typeof MODERATOR_PERMISSIONS)[number]["key"];

export function isModeratorPermission(value: string): value is ModeratorPermission {
  return MODERATOR_PERMISSIONS.some((permission) => permission.key === value);
}

// Kept here (not lib/adminAuth.ts) specifically so it has zero server-only
// dependencies (no next/headers, no service-role client) — this file is
// safe to import from Client Components like AdminSidebar for permission-
// based nav filtering, unlike adminAuth.ts which pulls in server-only
// Supabase clients.
export type ViewerAccess =
  | { kind: "admin"; userId: string; email: string }
  | { kind: "moderator"; userId: string; email: string; permissions: ModeratorPermission[] }
  | { kind: "none" };

export function hasPermission(access: ViewerAccess, permission: ModeratorPermission): boolean {
  return access.kind === "admin" || (access.kind === "moderator" && access.permissions.includes(permission));
}
