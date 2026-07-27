import Link from "next/link";
import { ToolIcon } from "./icons";
import type { Tool } from "@/lib/tools";

const accentClasses: Record<Tool["accent"], string> = {
  primary: "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-content",
  secondary: "bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-secondary-content",
  accent: "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-content",
};

export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={`/${tool.slug}`}
      // outline (not border) for definition — glass's own CSS sets `border:
      // none`, and its box-shadow already carries a white-tinted inset ring
      // that all but disappears in light mode where the card itself is
      // already near-white. outline is a separate property glass never
      // touches, so this stays visible regardless of theme or backdrop.
      className="group glass card p-5 outline-1 outline-base-content/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-300 ${accentClasses[tool.accent]}`}
      >
        <ToolIcon name={tool.icon} className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-base font-semibold text-base-content">{tool.name}</h3>
      <p className="mt-1 text-sm text-base-content/70">{tool.shortDescription}</p>
    </Link>
  );
}
