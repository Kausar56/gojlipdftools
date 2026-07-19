import Link from "next/link";
import { DecorativePanel } from "./DecorativePanel";
import { TrustBadges } from "./TrustBadges";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-20">
      <div className="text-center lg:text-left">
        <h1 className="text-4xl font-bold tracking-tight text-base-content sm:text-5xl">
          The Best Way to <span className="text-primary">Manage</span> Your PDFs
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base text-base-content/70 sm:text-lg lg:mx-0">
          PDFFlow is a free, browser-based toolkit for everyday document work. Merge, split,
          compress, and convert PDFs with precision — nothing to install.
        </p>
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
          <Link href="/#tools" className="btn btn-primary">
            Explore All Tools
          </Link>
          <Link href="/about" className="btn btn-outline">
            Learn More
          </Link>
        </div>
        <TrustBadges className="mt-8 justify-center lg:justify-start" />
      </div>

      <DecorativePanel />
    </section>
  );
}
