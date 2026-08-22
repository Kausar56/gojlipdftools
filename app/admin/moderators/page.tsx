import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { listModerators, listCandidateUsersForModeratorPicker } from "@/lib/moderators";
import { TeamManager } from "@/components/TeamManager";
import {
  grantModerator,
  updateModeratorPermissions,
  revokeModerator,
  disableTeamMember,
  enableTeamMember,
  resetTeamMemberPassword,
  getTeamMemberActivity,
} from "./actions";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { access } = await getCurrentViewerAccess();
  if (access.kind !== "admin") redirect("/admin/blog");

  const [members, candidateUsers] = await Promise.all([listModerators(), listCandidateUsersForModeratorPicker()]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-content">Team</h1>
      <p className="mt-1 text-sm text-base-content/60">
        Grant a signed-up user limited admin access as an Admin, Editor, Moderator, or Support role — pick a role
        for a sensible starting set of permissions, then fine-tune exactly what they get.
      </p>

      <div className="mt-6">
        <TeamManager
          members={members}
          candidateUsers={candidateUsers}
          grantAction={grantModerator}
          updateAction={updateModeratorPermissions}
          revokeAction={revokeModerator}
          disableAction={disableTeamMember}
          enableAction={enableTeamMember}
          resetPasswordAction={resetTeamMemberPassword}
          fetchActivity={getTeamMemberActivity}
        />
      </div>
    </div>
  );
}
