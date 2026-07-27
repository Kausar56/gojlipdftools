import Link from "next/link";
import { ToolIcon } from "./icons";
import { DecorativePanel } from "./DecorativePanel";
import { Reveal } from "./Reveal";

const reasons = [
  {
    title: "Secure by design",
    description: "Your files are processed locally in your browser and are never uploaded to a server.",
  },
  {
    title: "Fast, in-browser processing",
    description: "No upload wait — tools run the moment you drop a file in.",
  },
  {
    title: "Works everywhere",
    description: "No installation required. Works on Windows, macOS, Linux, and mobile browsers.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="bg-base-200 py-16">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-2 lg:items-center">
        <Reveal className="order-2 lg:order-1">
          <DecorativePanel />
        </Reveal>

        <div className="order-1 lg:order-2">
          <Reveal>
            <h2 className="text-2xl font-semibold text-base-content sm:text-3xl">
              Why Choose Gojli for Your Work?
            </h2>
          </Reveal>
          <ul className="mt-6 space-y-5">
            {reasons.map((reason, index) => (
              <Reveal key={reason.title} as="li" delayMs={100 + index * 120} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-secondary/15 text-secondary">
                  <ToolIcon name="check" className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="font-semibold text-base-content">{reason.title}</p>
                  <p className="mt-0.5 text-sm text-base-content/70">{reason.description}</p>
                </div>
              </Reveal>
            ))}
          </ul>
          <Link
            href="/about"
            className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary transition-all duration-300 hover:gap-2"
          >
            Read more about Gojli
            <ToolIcon name="arrow-right" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
