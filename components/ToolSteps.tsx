import type { Tool } from "@/lib/tools";

export function ToolSteps({ steps }: { steps: Tool["steps"] }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-base-content">How it works</h2>
      <ol className="mt-5 grid gap-4 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step} className="card border border-base-300 bg-base-100 p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-content">
              {index + 1}
            </span>
            <p className="mt-3 text-sm text-base-content/80">{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
