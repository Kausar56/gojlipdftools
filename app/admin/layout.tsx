import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentViewerAccess, type ViewerAccess } from "@/lib/adminAuth";
import { AdminSidebar } from "@/components/AdminSidebar";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin | Gojli" },
  description: "Gojli admin dashboard.",
  robots: { index: false, follow: false },
};

// Checks the session (and admin/moderator access) per-request, for every
// admin route — never statically cached.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user: { id: string; email: string | null } | null = null;
  let access: ViewerAccess = { kind: "none" };
  try {
    ({ user, access } = await getCurrentViewerAccess());
  } catch {
    // Supabase env vars aren't set up yet — treat as logged out below.
  }

  if (!user) redirect("/login?redirect=/admin");

  if (access.kind === "none") {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-semibold text-base-content">Access denied</h1>
        <p className="mt-2 text-base-content/70">Your account ({user.email}) doesn't have admin access.</p>
        <Link href="/dashboard" className="btn btn-primary mt-6">
          Go to your dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-base-200">
      <AdminSidebar email={user.email ?? ""} access={access} />
      <div className="flex-1 overflow-x-hidden pt-14 lg:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </div>
    </div>
  );
}
