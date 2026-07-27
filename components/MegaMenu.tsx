"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ToolIcon } from "./icons";
import { getToolBySlug, type Tool } from "@/lib/tools";
import { megaMenu } from "@/lib/megaMenu";

const accentTextClasses: Record<Tool["accent"], string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
};

export function MegaMenu() {
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
    <div ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-1 hover:text-primary"
      >
        All Tools
        <ToolIcon name="chevron-down" className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Always mounted (not `{open && ...}`) and animated via classes instead —
          conditionally mounting meant it could only ever pop in/out instantly,
          since there was no time for a closing transition to play before the
          element left the DOM. */}
      <div
        className={`fixed inset-x-0 top-16 z-30 flex justify-center px-4 transition-all duration-200 ease-out ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="relative w-full max-w-275 rounded-2xl border border-base-300 bg-base-100 p-6 shadow-2xl">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="btn btn-ghost btn-sm btn-circle absolute right-4 top-4"
          >
            <ToolIcon name="close" className="h-4 w-4" />
          </button>
          <div className="grid grid-cols-2 gap-6 pr-8 sm:grid-cols-3 lg:grid-cols-5">
            {megaMenu.map((category) => (
              <div key={category.title}>
                <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40">
                  {category.title}
                </p>
                <ul className="mt-3 space-y-2.5">
                  {category.items.map((item) => {
                    const tool = item.slug ? getToolBySlug(item.slug) : undefined;

                    if (tool) {
                      return (
                        <li key={tool.slug}>
                          <Link
                            href={`/${tool.slug}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2 text-sm text-base-content/80 hover:text-primary"
                          >
                            <ToolIcon name={tool.icon} className={`h-4 w-4 ${accentTextClasses[tool.accent]}`} />
                            {tool.name}
                          </Link>
                        </li>
                      );
                    }

                    return (
                      <li key={item.label} className="flex items-center gap-2 text-sm text-base-content/40">
                        {item.label}
                        <span className="badge badge-ghost badge-xs">Soon</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
