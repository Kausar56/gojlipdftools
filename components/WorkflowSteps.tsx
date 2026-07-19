import { ToolIcon } from "./icons";

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
    <section className="bg-base-100 py-16">
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-8">
        <h2 className="text-2xl font-semibold text-base-content sm:text-3xl">Simplify Your Workflow</h2>
        <div className="mt-10 grid gap-10 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="flex flex-col items-center">
              <span className={`flex h-14 w-14 items-center justify-center rounded-full ${step.accent}`}>
                <ToolIcon name={step.icon} className="h-6 w-6" />
              </span>
              <p className="mt-4 font-semibold text-base-content">{step.title}</p>
              <p className="mt-1 max-w-xs text-sm text-base-content/70">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
