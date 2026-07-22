import Link from "next/link";
import { UploadDropzone } from "./UploadDropzone";
import { ToolSteps } from "./ToolSteps";
import { ToolFaq } from "./ToolFaq";
import type { Tool } from "@/lib/tools";

export function ToolPageLayout({
  tool,
  workspace,
  maxWidthClassName = "max-w-4xl",
}: {
  tool: Tool;
  workspace?: React.ReactNode;
  maxWidthClassName?: string;
}) {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, var(--color-base-content) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
            maskImage: "linear-gradient(to bottom, black, black 60%, transparent)",
            opacity: 0.18,
          }}
        />

        <div className={`relative mx-auto px-4 pt-10 pb-14 sm:px-8 ${maxWidthClassName}`}>
          <div className="breadcrumbs text-sm text-base-content/60">
            <ul>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>{tool.name}</li>
            </ul>
          </div>

          <div className="mt-4 text-center sm:text-left">
            <h1 className="text-3xl font-semibold text-base-content sm:text-4xl">{tool.name}</h1>
            <p className="mt-3 max-w-2xl text-base text-base-content/70 sm:text-lg">{tool.heroDescription}</p>
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

      <section className="relative overflow-hidden bg-base-200 pt-4 pb-16 sm:pb-20">
        <div className={`relative mx-auto px-4 sm:px-8 ${maxWidthClassName}`}>
          <div className="-mt-4">{workspace ?? <UploadDropzone accept={tool.accept} actionLabel={tool.name} />}</div>
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

      <div className="bg-base-100 py-14">
        <div className={`relative mx-auto px-4 sm:px-8 ${maxWidthClassName}`}>
          <ToolSteps tool={tool} />

          <div className="mt-14">
            <ToolFaq faqs={tool.faqs} />
          </div>

          <div className="mt-14 text-center">
            <Link href="/#tools" className="btn btn-outline btn-primary">
              Explore all PDF tools
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
