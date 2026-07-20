import Link from "next/link";
import { UploadDropzone } from "./UploadDropzone";
import { TrustBadges } from "./TrustBadges";
import { ToolSteps } from "./ToolSteps";
import { ToolFaq } from "./ToolFaq";
import type { Tool } from "@/lib/tools";

export function ToolPageLayout({
  tool,
  workspace,
  showTrustBadges = true,
}: {
  tool: Tool;
  workspace?: React.ReactNode;
  showTrustBadges?: boolean;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
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

      <div className="mt-8">
        {workspace ?? <UploadDropzone accept={tool.accept} actionLabel={tool.name} />}
      </div>

      {showTrustBadges && <TrustBadges className="mt-8 justify-center sm:justify-start" />}

      <div className="mt-14">
        <ToolSteps steps={tool.steps} />
      </div>

      <div className="mt-14">
        <ToolFaq faqs={tool.faqs} />
      </div>

      <div className="mt-14 text-center">
        <Link href="/#tools" className="btn btn-outline btn-primary">
          Explore all PDF tools
        </Link>
      </div>
    </div>
  );
}
