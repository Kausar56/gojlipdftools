import { ToolIcon } from "./icons";

const chips = [
  { icon: "merge", accent: "bg-primary text-primary-content" },
  { icon: "compress", accent: "bg-secondary text-secondary-content" },
  { icon: "watermark-pdf", accent: "bg-accent text-accent-content" },
];

export function DecorativePanel({ className }: { className?: string }) {
  return (
    <div
      className={`relative rounded-3xl bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/15 p-6 sm:p-8 ${className ?? ""}`}
    >
      <div className="rounded-2xl border border-base-300 bg-base-100 shadow-xl">
        <div className="flex items-center gap-1.5 border-b border-base-300 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-error/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          <span className="ml-3 h-2 w-28 rounded-full bg-base-300" />
        </div>
        <div className="space-y-3 p-5">
          <div className="h-3 w-2/3 rounded-full bg-base-300" />
          <div className="h-3 w-1/2 rounded-full bg-base-300" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {chips.map((chip) => (
              <div
                key={chip.icon}
                className={`flex h-14 items-center justify-center rounded-xl ${chip.accent}`}
              >
                <ToolIcon name={chip.icon} className="h-5 w-5" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-5 flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-4 py-2.5 shadow-lg">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success">
          <ToolIcon name="check" className="h-4 w-4" />
        </span>
        <div className="text-xs">
          <p className="font-semibold text-base-content">File ready</p>
          <p className="text-base-content/60">Processed in your browser</p>
        </div>
      </div>
    </div>
  );
}
