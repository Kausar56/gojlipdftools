"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasPermission, hasAnyBlogPermission, MODERATOR_ROLE_LABELS, type ViewerAccess } from "@/lib/permissions";
import { ToolIcon } from "./icons";

// Add more sections here as the admin area grows — each just needs its own
// app/admin/<slug>/page.tsx (with its own guard at the top, since a
// moderator could still reach the URL directly even with no sidebar link to
// it — `check` here only controls whether the link is *shown*).
const NAV_ITEMS: { href: string; label: string; icon: string; check: (access: ViewerAccess) => boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: "grid", check: (access) => hasPermission(access, "dashboard:view") },
  {
    href: "/admin/users",
    label: "Users",
    icon: "users",
    check: (access) => hasPermission(access, "users:view") || hasPermission(access, "users:manage"),
  },
  { href: "/admin/stats", label: "Statistics", icon: "chart", check: (access) => hasPermission(access, "stats:view") },
  { href: "/admin/tickets", label: "Tickets", icon: "ticket", check: (access) => hasPermission(access, "tickets:manage") },
  { href: "/admin/blog", label: "Blog", icon: "file", check: (access) => hasAnyBlogPermission(access) },
  {
    href: "/admin/tool-content",
    label: "Tool Content",
    icon: "text-multiline",
    check: (access) => hasPermission(access, "tool_content:edit"),
  },
  { href: "/admin/moderators", label: "Moderators", icon: "shield", check: (access) => access.kind === "admin" },
  { href: "/admin/settings", label: "Settings", icon: "settings", check: (access) => access.kind === "admin" },
  {
    href: "/admin/audit-log",
    label: "Audit Log",
    icon: "history",
    check: (access) => hasPermission(access, "audit_log:view_own"),
  },
];

export function AdminSidebar({ email, access }: { email: string; access: ViewerAccess }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const navItems = NAV_ITEMS.filter((item) => item.check(access));

  async function handleLogout() {
    setOpen(false);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Not configured — nothing to sign out of.
    }
    router.push("/");
    router.refresh();
  }

  return (
    <>
      {/* Mobile-only topbar — the sidebar itself becomes an off-canvas drawer
          below lg, so this is the only way to open/close it on small screens. */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-base-300 bg-base-100 px-4 py-3 lg:hidden">
        <Link href="/" className="text-base font-semibold text-base-content" onClick={() => setOpen(false)}>
          Gojli <span className="text-primary">Admin</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="btn btn-ghost btn-sm btn-circle"
        >
          <ToolIcon name={open ? "close" : "menu"} className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto border-r border-base-300 bg-base-100 p-4 transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-56 lg:self-start lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link href="/" className="mb-6 text-lg font-semibold text-base-content" onClick={() => setOpen(false)}>
          Gojli <span className="text-primary">Admin</span>
        </Link>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  active ? "bg-primary text-primary-content" : "text-base-content/70 hover:bg-base-200"
                }`}
              >
                <ToolIcon name={item.icon} className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-base-300 pt-3">
          <p className="truncate text-xs text-base-content/50" title={email}>
            {email}
          </p>
          {access.kind === "admin" && <span className="badge badge-primary badge-xs mt-1">Super Admin</span>}
          {access.kind === "moderator" && (
            <span className="badge badge-neutral badge-xs mt-1">{MODERATOR_ROLE_LABELS[access.role]}</span>
          )}
          <div className="mt-2 flex flex-col gap-1">
            <Link href="/dashboard" onClick={() => setOpen(false)} className="text-xs text-primary hover:underline">
              Back to your dashboard
            </Link>
            <button type="button" onClick={handleLogout} className="text-left text-xs text-error hover:underline">
              Log out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
