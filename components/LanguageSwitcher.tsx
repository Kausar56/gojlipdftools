"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";

const languages = [
  { code: "en", label: "English" },
  { code: "bn", label: "বাংলা" },
];

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(languages[0]);
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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Change language"
        className="btn btn-ghost btn-sm gap-1 px-2"
      >
        <ToolIcon name="globe" className="h-4 w-4" />
        <span className="hidden sm:inline">{selected.code.toUpperCase()}</span>
      </button>

      {open && (
        <ul className="absolute right-0 top-full z-30 mt-2 w-36 rounded-xl border border-base-300 bg-base-100 p-1.5 shadow-lg">
          {languages.map((language) => (
            <li key={language.code}>
              <button
                type="button"
                onClick={() => {
                  setSelected(language);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-base-200 ${
                  selected.code === language.code ? "font-medium text-primary" : "text-base-content/80"
                }`}
              >
                {language.label}
                {selected.code === language.code && <ToolIcon name="check" className="h-3.5 w-3.5" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
