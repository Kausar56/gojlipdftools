import Link from "next/link";
import { DecorativePanel } from "./DecorativePanel";
import { ToolIcon } from "./icons";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, var(--color-base-content) 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
          maskImage: "linear-gradient(to bottom, black, black 70%, transparent)",
          opacity: 0.18,
        }}
      />

      {/* Soft animated glow behind the decorative panel — pure CSS, no JS needed
          since it's a fixed idle motion, not something reacting to scroll. */}
      <div
        className="animate-blob pointer-events-none absolute top-1/2 right-0 -z-10 h-80 w-80 -translate-y-1/2 rounded-full bg-linear-to-br from-primary/25 via-secondary/20 to-accent/25 opacity-60 blur-3xl sm:h-[26rem] sm:w-[26rem]"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-20">
        <div className="text-center lg:text-left">
          <span
            className="animate-fade-in-up inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            style={{ animationDelay: "0ms" }}
          >
            <ToolIcon name="shield" className="h-3.5 w-3.5" />
            100% browser-based — files never leave your device
          </span>
          <h1
            className="animate-fade-in-up font-display mt-4 text-4xl font-bold tracking-tight text-base-content sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            The Best Way to{" "}
            <span className="bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Manage
            </span>{" "}
            Your PDFs
          </h1>
          <p
            className="animate-fade-in-up mx-auto mt-4 max-w-lg text-base text-base-content/70 sm:text-lg lg:mx-0"
            style={{ animationDelay: "180ms" }}
          >
            Gojli is a free, browser-based toolkit for everyday document work. Merge, split,
            compress, and convert PDFs with precision — nothing to install.
          </p>
          <div
            className="animate-fade-in-up mt-7 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
            style={{ animationDelay: "280ms" }}
          >
            <Link
              href="/#tools"
              className="btn btn-primary transition-transform duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/30"
            >
              Explore All Tools
            </Link>
            <Link href="/about" className="btn btn-outline transition-transform duration-300 hover:scale-105">
              Learn More
            </Link>
          </div>
        </div>

        {/* DecorativePanel runs its own GSAP entrance/float/tilt — no CSS
            fade-in wrapper needed here, that would just double up on it. */}
        <DecorativePanel />
      </div>

      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full text-base-200 sm:h-20"
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,40 C360,100 1080,0 1440,60 L1440,100 L0,100 Z" fill="currentColor" />
      </svg>
    </section>
  );
}
