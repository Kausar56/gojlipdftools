"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/useSupabaseUser";
import { ToolIcon } from "./icons";

export function UserMenu() {
  const router = useRouter();
  const user = useSupabaseUser();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

  if (user === undefined) {
    return <span className="btn btn-primary btn-sm hidden lg:inline-flex opacity-0" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Link href="/login" className="btn btn-primary btn-sm hidden lg:inline-flex">
        Login
      </Link>
    );
  }

  const label = (user.user_metadata?.full_name as string | undefined) || user.email || "Account";
  const initial = label.charAt(0).toUpperCase();

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-content"
      >
        {initial}
      </button>

      {open && (
        <ul className="absolute right-0 top-full z-30 mt-2 w-48 rounded-xl border border-base-300 bg-base-100 p-1.5 shadow-lg">
          <li className="truncate px-3 py-2 text-xs text-base-content/50">{label}</li>
          <li>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-base-content/80 hover:bg-base-200"
            >
              <ToolIcon name="check" className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-error hover:bg-error/10"
            >
              <ToolIcon name="close" className="h-3.5 w-3.5" />
              Log out
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
