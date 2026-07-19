import Link from "next/link";
import { ToolIcon } from "./icons";
import type { Tool } from "@/lib/tools";

const accentTextClasses: Record<Tool["accent"], string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
};

export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={`/${tool.slug}`}
      className="card border border-base-300 bg-base-100 p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <ToolIcon name={tool.icon} className={`h-6 w-6 ${accentTextClasses[tool.accent]}`} />
      <h3 className="mt-3 text-base font-semibold text-base-content">{tool.name}</h3>
      <p className="mt-1 text-sm text-base-content/70">{tool.shortDescription}</p>
    </Link>
  );
}
