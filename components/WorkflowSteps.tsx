import { ToolIcon } from "./icons";
import { Reveal } from "./Reveal";

const steps = [
  {
    icon: "upload",
    accent: "bg-primary text-primary-content",
    title: "1. Upload",
    description: "Drag and drop your files directly into the browser — nothing leaves your device.",
  },
  {
    icon: "bolt",
    accent: "bg-secondary text-secondary-content",
    title: "2. Process",
    description: "Choose your settings and let the tool do the work, right where your file already is.",
  },
  {
    icon: "check",
    accent: "bg-accent text-accent-content",
    title: "3. Download",
    description: "Save your finished file straight back to your device.",
  },
];

export function WorkflowSteps() {
  return (
    <section className="relative overflow-hidden bg-base-100 pt-16 pb-24">
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-8">
        <Reveal>
          <h2 className="text-2xl font-semibold text-base-content sm:text-3xl">Simplify Your Workflow</h2>
        </Reveal>
        <div className="relative mt-10 grid gap-10 sm:grid-cols-3">
          {/* Connecting line behind the three step badges, only meaningful once
              they're side-by-side — hidden on the mobile stacked layout. */}
          <div
            className="pointer-events-none absolute top-7 right-[16.5%] left-[16.5%] hidden border-t-2 border-dashed border-base-300 sm:block"
            aria-hidden="true"
          />
          {steps.map((step, index) => (
            <Reveal key={step.title} delayMs={index * 150} className="relative flex flex-col items-center">
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full ${step.accent} transition-transform duration-300 hover:scale-110`}
              >
                <ToolIcon name={step.icon} className="h-6 w-6" />
              </span>
              <p className="mt-4 font-semibold text-base-content">{step.title}</p>
              <p className="mt-1 max-w-xs text-sm text-base-content/70">{step.description}</p>
            </Reveal>
          ))}
        </div>
      </div>

      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full text-base-200 sm:h-16"
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,40 C360,100 1080,0 1440,60 L1440,100 L0,100 Z" fill="currentColor" />
      </svg>
    </section>
  );
}
