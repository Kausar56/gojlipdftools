import { Hero } from "@/components/Hero";
import { WorkflowSteps } from "@/components/WorkflowSteps";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { ToolGrid } from "@/components/ToolGrid";
import { tools } from "@/lib/tools";

const SITE_URL = "https://www.gojli.com";

// Organization + WebSite structured data — every other page here has its
// own JSON-LD (blog posts, tool pages), but the site's own top-level entity
// had none. No `potentialAction` (sitelinks search box) since there's no
// actual on-site search to point it at — a broken/fake one would be worse
// than none.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Gojli",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      description:
        "Free, browser-based PDF tools to merge, split, compress, and convert PDF files online. No installation required.",
    },
    {
      "@type": "WebSite",
      name: "Gojli",
      url: SITE_URL,
    },
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero />

      <section id="tools" className="relative overflow-hidden bg-base-200 pt-16 pb-24">
        {/* The glass cards in ToolGrid need something visually rich behind them
            to actually read as "frosted glass" — against a flat bg-base-200
            (especially in light mode, where base-100/base-200 are both close
            to white) the blur effect had nothing to blur and the cards looked
            washed out. These soft, blurred color blobs give it that backdrop. */}
        <div
          className="pointer-events-none absolute -top-10 -left-20 -z-0 h-72 w-72 rounded-full bg-primary/20 opacity-60 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-1/3 -right-24 -z-0 h-80 w-80 rounded-full bg-secondary/20 opacity-50 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/3 -z-0 h-64 w-64 rounded-full bg-accent/15 opacity-50 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-8">
          <ToolGrid tools={tools} />
        </div>

        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full text-base-100 sm:h-24"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,70 C160,30 320,100 480,70 C640,40 800,100 960,70 C1120,40 1280,100 1440,70 L1440,120 L0,120 Z"
            fill="currentColor"
            opacity="0.45"
          />
          <path
            d="M0,90 C120,60 240,110 360,90 C480,70 600,110 720,90 C840,70 960,110 1080,90 C1200,70 1320,105 1440,85 L1440,120 L0,120 Z"
            fill="currentColor"
          />
        </svg>
      </section>

      <WorkflowSteps />
      <WhyChooseUs />
    </>
  );
}
