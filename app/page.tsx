import { Hero } from "@/components/Hero";
import { WorkflowSteps } from "@/components/WorkflowSteps";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { ToolGrid } from "@/components/ToolGrid";
import { tools } from "@/lib/tools";

export default function Home() {
  return (
    <>
      <Hero />

      <section id="tools" className="relative overflow-hidden bg-base-200 pt-16 pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-base-content sm:text-3xl">Every Tool You Need</h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-base-content/70">
              Gojli offers a complete toolkit to handle any document task in seconds, directly in your
              browser.
            </p>
          </div>
          <div className="mt-10">
            <ToolGrid tools={tools} />
          </div>
        </div>

        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full text-base-100 sm:h-16"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,40 C360,100 1080,0 1440,60 L1440,100 L0,100 Z" fill="currentColor" />
        </svg>
      </section>

      <WorkflowSteps />
      <WhyChooseUs />
    </>
  );
}
