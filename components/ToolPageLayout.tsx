import Link from "next/link";
import { UploadDropzone } from "./UploadDropzone";
import { ToolGuide } from "./ToolGuide";
import { ToolFaq } from "./ToolFaq";
import { RecentToolTracker } from "./RecentToolTracker";
import { ToolIcon } from "./icons";
import { getToolStatusMap } from "@/lib/appSettings";
import { getEffectiveToolContent } from "@/lib/toolContent";
import type { Tool } from "@/lib/tools";

// The one place all ~44 tool pages route through (every app/<slug>/page.tsx
// is a thin `<ToolPageLayout tool={tool} workspace={<XWorkspace/>} />`
// wrapper) — checking the admin-set disabled flag here applies it to every
// tool at once instead of editing each page.tsx individually.
export async function ToolPageLayout({
  tool,
  workspace,
  maxWidthClassName = "max-w-4xl",
}: {
  tool: Tool;
  workspace?: React.ReactNode;
  maxWidthClassName?: string;
}) {
  const [toolStatusMap, content] = await Promise.all([getToolStatusMap(), getEffectiveToolContent(tool)]);
  const toolStatus = toolStatusMap[tool.slug];

  return (
    <div>
      <RecentToolTracker slug={tool.slug} />

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
          <div className="-mt-4">
            {toolStatus?.disabled ? (
              <div className="card flex flex-col items-center gap-3 border border-warning/30 bg-base-100 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
                  <ToolIcon name="bolt" className="h-6 w-6" />
                </span>
                <p className="font-medium text-base-content">This tool is temporarily unavailable.</p>
                <p className="max-w-sm text-sm text-base-content/60">
                  {toolStatus.message || "We're working on it — please check back soon."}
                </p>
              </div>
            ) : (
              workspace ?? <UploadDropzone accept={tool.accept} actionLabel={tool.name} />
            )}
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

      <div className="bg-base-100 py-14">
        <div className={`relative mx-auto px-4 sm:px-8 ${maxWidthClassName}`}>
          <ToolGuide title={content.guideTitle} guideHtml={content.guideHtml} />

          <div className="mt-14">
            <ToolFaq faqs={content.faqs} />
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
