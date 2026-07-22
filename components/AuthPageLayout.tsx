export function AuthPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, var(--color-base-content) 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
          opacity: 0.18,
        }}
      />

      <div className="relative mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-14 sm:px-8">
        {children}
      </div>
    </div>
  );
}
