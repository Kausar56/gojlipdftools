import type { Tool } from "@/lib/tools";

export function ToolSteps({ tool }: { tool: Tool }) {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to use the ${tool.name} tool`,
    description: tool.guideIntro,
    step: tool.guideSteps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.description,
    })),
  };

  return (
    <section>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />

      <article>
        <h2 className="text-xl font-semibold text-base-content sm:text-2xl">How {tool.name} works</h2>
        <p className="mt-3 max-w-2xl text-base-content/70">{tool.guideIntro}</p>

        <ol className="mt-8 space-y-8">
          {tool.guideSteps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-content">
                {index + 1}
              </span>
              <div className="flex-1">
                <h3 className="font-semibold text-base-content">{step.title}</h3>
                <p className="mt-1.5 text-sm text-base-content/70">{step.description}</p>
                {step.imageSrc && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={step.imageSrc}
                    alt={`${step.title} — ${tool.name} screenshot`}
                    className="mt-3 w-full max-w-lg rounded-lg border border-base-300"
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      </article>
    </section>
  );
}
