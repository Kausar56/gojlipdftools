"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/useSupabaseUser";
import { ToolIcon } from "./icons";

const navLinks = [
  { href: "/#tools", label: "All Tools" },
  { href: "/edit-pdf", label: "Edit" },
  { href: "/compress-pdf", label: "Compress" },
  { href: "/merge-pdf", label: "Merge" },
  { href: "/split-pdf", label: "Split" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export function MobileMenu() {
  const router = useRouter();
  const user = useSupabaseUser();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div ref={containerRef} className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="btn btn-ghost btn-sm btn-circle"
      >
        <ToolIcon name={open ? "close" : "menu"} className="h-5 w-5" />
      </button>

      {/* pointer-events instead of visible/invisible — Tailwind's default
          `transition` property list doesn't include `visibility`, so toggling
          it snapped the menu hidden instantly at the start of the close
          transition instead of after the opacity/transform fade played out,
          making the close feel instant even though it was "animated". */}
      <div
        className={`absolute inset-x-0 top-full z-30 origin-top border-b border-base-300 bg-base-100 px-4 py-4 shadow-lg transition duration-200 ease-out sm:px-8 ${
          open ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-2 scale-95 opacity-0"
        }`}
      >
        <ul className="flex flex-col gap-1 text-sm font-medium text-base-content/80">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-2 py-2 hover:bg-base-200 hover:text-primary"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        {user ? (
          <div className="mt-3 flex gap-2">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="btn btn-outline btn-sm flex-1"
            >
              Dashboard
            </Link>
            <button type="button" onClick={handleLogout} className="btn btn-primary btn-sm flex-1">
              Log out
            </button>
          </div>
        ) : (
          <Link href="/login" onClick={() => setOpen(false)} className="btn btn-primary btn-sm mt-3 w-full">
            Login
          </Link>
        )}
      </div>
    </div>
  );
}
