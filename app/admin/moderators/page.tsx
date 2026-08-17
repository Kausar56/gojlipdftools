import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { listModerators, listCandidateUsersForModeratorPicker } from "@/lib/moderators";
import { ModeratorsManager } from "@/components/ModeratorsManager";
import { grantModerator, updateModeratorPermissions, revokeModerator } from "./actions";

export const metadata: Metadata = { title: "Moderators" };
export const dynamic = "force-dynamic";

export default async function ModeratorsPage() {
  const { access } = await getCurrentViewerAccess();
  if (access.kind !== "admin") redirect("/admin/blog");

  const [moderators, candidateUsers] = await Promise.all([
    listModerators(),
    listCandidateUsersForModeratorPicker(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-content">Moderators</h1>
      <p className="mt-1 text-sm text-base-content/60">
        Grant a signed-up user limited admin access — pick exactly which permissions they get when you add them.
      </p>

      <div className="mt-6">
        <ModeratorsManager
          moderators={moderators}
          candidateUsers={candidateUsers}
          grantAction={grantModerator}
          updateAction={updateModeratorPermissions}
          revokeAction={revokeModerator}
        />
      </div>
    </div>
  );
}
