import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { getBannerSettings, getToolStatusMap } from "@/lib/appSettings";
import { tools } from "@/lib/tools";
import { BannerEditor } from "@/components/BannerEditor";
import { ToolStatusManager } from "@/components/ToolStatusManager";
import { updateBanner, updateToolStatus } from "./actions";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { access } = await getCurrentViewerAccess();
  if (access.kind !== "admin") redirect("/admin/blog");

  const [banner, statusMap] = await Promise.all([getBannerSettings(), getToolStatusMap()]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-base-content">Settings</h1>
        <p className="mt-1 text-sm text-base-content/60">Site-wide config that takes effect immediately, no redeploy.</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-base-content/80">Announcement banner</h2>
        <p className="mt-1 text-xs text-base-content/50">
          Shown at the top of the site — never in the admin panel. Choose which pages below.
        </p>
        <div className="mt-2">
          <BannerEditor banner={banner} action={updateBanner} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-base-content/80">Tool availability</h2>
        <p className="mt-1 text-xs text-base-content/50">
          Disable a tool to show visitors a “temporarily unavailable” message instead of its upload area.
        </p>
        <div className="mt-2">
          <ToolStatusManager tools={tools} statusMap={statusMap} action={updateToolStatus} />
        </div>
      </div>
    </div>
  );
}
