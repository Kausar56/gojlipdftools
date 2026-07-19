"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ToolIcon } from "./icons";

const navLinks = [
  { href: "/#tools", label: "All Tools" },
  { href: "/compress-pdf", label: "Compress" },
  { href: "/merge-pdf", label: "Merge" },
  { href: "/split-pdf", label: "Split" },
  { href: "/about", label: "About" },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

      {open && (
        <div className="absolute inset-x-0 top-full z-30 border-b border-base-300 bg-base-100 px-4 py-4 shadow-lg sm:px-8">
          <label className="input input-bordered flex items-center gap-2">
            <ToolIcon name="search" className="h-3.5 w-3.5 text-base-content/50" />
            <input type="text" placeholder="Search tools..." className="grow" />
          </label>
          <ul className="mt-4 flex flex-col gap-1 text-sm font-medium text-base-content/80">
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
          <button type="button" className="btn btn-primary btn-sm mt-3 w-full">
            Sign In
            <span className="badge badge-ghost badge-xs">Soon</span>
          </button>
        </div>
      )}
    </div>
  );
}
