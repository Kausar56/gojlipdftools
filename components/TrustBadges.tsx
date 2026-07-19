import { ToolIcon } from "./icons";

const trustBadges = [
  { icon: "shield", label: "Processed in your browser" },
  { icon: "bolt", label: "No upload wait" },
  { icon: "check", label: "No installation required" },
];

export function TrustBadges({ className }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-6 text-sm text-base-content/60 ${className ?? ""}`}>
      {trustBadges.map((badge) => (
        <span key={badge.label} className="flex items-center gap-2">
          <ToolIcon name={badge.icon} className="h-4 w-4 text-secondary" />
          {badge.label}
        </span>
      ))}
    </div>
  );
}
