import { ToolCard } from "./ToolCard";
import { ToolIcon } from "./icons";
import { Reveal } from "./Reveal";
import { megaMenu } from "@/lib/megaMenu";
import type { Tool } from "@/lib/tools";

const MOST_POPULAR_SLUGS = [
  "merge-pdf",
  "split-pdf",
  "compress-pdf",
  "edit-pdf",
  "pdf-to-word",
  "word-to-pdf",
  "jpg-to-pdf",
  "protect-pdf",
];

function DisabledToolCard({ label }: { label: string }) {
  return (
    <div
      aria-disabled="true"
      title="Coming soon"
      className="glass card cursor-not-allowed p-5 opacity-50 outline-1 outline-base-content/10"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-base-content/10 text-base-content/50">
        <ToolIcon name="file" className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-base font-semibold text-base-content/60">{label}</h3>
      <p className="mt-1 text-sm text-base-content/40">Coming soon.</p>
    </div>
  );
}

export function ToolGrid({ tools }: { tools: Tool[] }) {
  const bySlug = new Map(tools.map((tool) => [tool.slug, tool]));
  const mostPopular = MOST_POPULAR_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (tool): tool is Tool => Boolean(tool),
  );

  return (
    <div className="space-y-12">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-base-content">Most Popular</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mostPopular.map((tool, index) => (
            <Reveal key={tool.slug} delayMs={Math.min(index, 7) * 60}>
              <ToolCard tool={tool} />
            </Reveal>
          ))}
        </div>
      </div>

      {megaMenu.map((category, categoryIndex) => (
        <Reveal key={category.title} delayMs={Math.min(categoryIndex, 6) * 60}>
          <h3 className="mb-4 text-lg font-semibold text-base-content">{category.title}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {category.items.map((item) => {
              const tool = item.slug ? bySlug.get(item.slug) : undefined;
              return tool ? (
                <ToolCard key={item.label} tool={tool} />
              ) : (
                <DisabledToolCard key={item.label} label={item.label} />
              );
            })}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

