// The full set of grantable moderator permissions — an admin picks a subset
// of these when adding or editing a moderator (see app/admin/moderators).
// New permission keys can be appended here later without touching the
// grant/check plumbing in lib/adminAuth.ts.
export const MODERATOR_PERMISSIONS = [
  { key: "blog:create", label: "Create blog posts" },
  { key: "blog:edit_own", label: "Edit their own blog posts" },
  { key: "blog:delete_own", label: "Delete their own blog posts" },
  { key: "blog:edit_any", label: "Edit any blog post, not just their own" },
  { key: "blog:delete_any", label: "Delete any blog post, not just their own" },
  { key: "dashboard:view", label: "View the admin dashboard" },
  { key: "stats:view", label: "View site statistics" },
  { key: "tool_content:edit", label: "Edit tool guide/FAQ content" },
  { key: "users:view", label: "View the users list (read-only)" },
  // Upgrade/downgrade plan, ban/unban, and delete — everything users:view
  // doesn't cover. Kept as its own permission (not folded into users:view)
  // so a Support-style grant can see the list without touching accounts.
  { key: "users:manage", label: "Change user plans, ban, and delete accounts" },
  // Scoped to the actor's own entries — see getRecentAuditLog's actorId
  // filter in app/admin/audit-log/page.tsx. A real admin still sees everyone's.
  { key: "audit_log:view_own", label: "View their own actions in the audit log" },
  // View every user's support tickets, reply, and change status — see
  // app/admin/tickets. Deliberately one all-or-nothing permission (no
  // separate view-only tier) since a ticket is only useful to look at if you
  // can also reply to it.
  { key: "tickets:manage", label: "View and reply to support tickets" },
] as const;

export type ModeratorPermission = (typeof MODERATOR_PERMISSIONS)[number]["key"];

export function isModeratorPermission(value: string): value is ModeratorPermission {
  return MODERATOR_PERMISSIONS.some((permission) => permission.key === value);
}

// A label on top of the same flat `permissions` array, not a separate
// authorization path — hasPermission() below only ever looks at the actual
// granted permissions, never at `role` directly. The role just (a) drives
// the preset checkbox bundle ROLE_PRESETS fills in when adding someone, and
// (b) shows a clearer badge than "Moderator" for everyone, in the
// moderators list and the admin sidebar.
export const MODERATOR_ROLES = ["admin", "moderator", "support"] as const;
export type ModeratorRole = (typeof MODERATOR_ROLES)[number];

export function isModeratorRole(value: string): value is ModeratorRole {
  return (MODERATOR_ROLES as readonly string[]).includes(value);
}

export const MODERATOR_ROLE_LABELS: Record<ModeratorRole, string> = {
  admin: "Admin",
  moderator: "Moderator",
  support: "Support",
};

// Starting checkbox state when an admin picks a role in the "add" modal —
// still fully editable afterward, individually or via the role picker again.
export const MODERATOR_ROLE_PRESETS: Record<ModeratorRole, ModeratorPermission[]> = {
  // A broad, trusted grant — everything short of managing other
  // moderators/settings, which stay reserved for a real (env-listed) admin.
  admin: [
    "blog:create",
    "blog:edit_own",
    "blog:delete_own",
    "blog:edit_any",
    "blog:delete_any",
    "dashboard:view",
    "stats:view",
    "tool_content:edit",
    "users:view",
    "users:manage",
    "audit_log:view_own",
    "tickets:manage",
  ],
  // Ticket handling isn't specific to any one role — a Moderator can field
  // support tickets alongside blog work just as easily as Admin or Support
  // can, so all three presets include it.
  moderator: ["blog:create", "blog:edit_own", "blog:delete_own", "tickets:manage"],
  // Support agents need to see enough to help a user (and handle their
  // tickets), not change accounts or content.
  support: ["users:view", "dashboard:view", "audit_log:view_own", "tickets:manage"],
};

// Kept here (not lib/adminAuth.ts) specifically so it has zero server-only
// dependencies (no next/headers, no service-role client) — this file is
// safe to import from Client Components like AdminSidebar for permission-
// based nav filtering, unlike adminAuth.ts which pulls in server-only
// Supabase clients.
export type ViewerAccess =
  | { kind: "admin"; userId: string; email: string }
  | { kind: "moderator"; userId: string; email: string; role: ModeratorRole; permissions: ModeratorPermission[] }
  | { kind: "none" };

export function hasPermission(access: ViewerAccess, permission: ModeratorPermission): boolean {
  return access.kind === "admin" || (access.kind === "moderator" && access.permissions.includes(permission));
}

// The blog list page shows every post regardless of which specific blog
// action a moderator can take on them — a moderator granted only, say,
// "stats:view" has none of these and shouldn't see the Blog section at all.
const BLOG_PERMISSIONS: ModeratorPermission[] = [
  "blog:create",
  "blog:edit_own",
  "blog:delete_own",
  "blog:edit_any",
  "blog:delete_any",
];

export function hasAnyBlogPermission(access: ViewerAccess): boolean {
  return access.kind === "admin" || (access.kind === "moderator" && BLOG_PERMISSIONS.some((p) => access.permissions.includes(p)));
}
