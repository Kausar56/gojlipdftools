"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

/** The admin area has its own sidebar-based layout (app/admin/layout.tsx)
 *  with no use for the main site's nav/footer — this is the one place that
 *  chrome needs to differ per route, so it's a small client check here
 *  rather than restructuring every existing route into a route group just
 *  for this. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return <>{children}</>;

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
