"use client";

import { useRouter } from "next/navigation";
import { UserBanToggleButton } from "./UserBanToggleButton";
import { UserDeleteButton } from "./UserDeleteButton";

export function UserDetailActionsBar({
  userId,
  userEmail,
  isBanned,
  banAction,
  unbanAction,
  deleteAction,
}: {
  userId: string;
  userEmail: string;
  isBanned: boolean;
  banAction: (userId: string) => void | Promise<void>;
  unbanAction: (userId: string) => void | Promise<void>;
  deleteAction: (userId: string) => void | Promise<void>;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <UserBanToggleButton
        userId={userId}
        userEmail={userEmail}
        isBanned={isBanned}
        banAction={banAction}
        unbanAction={unbanAction}
        banLabel="Suspend account"
        unbanLabel="Activate account"
        className="btn btn-outline btn-sm"
      />
      <UserDeleteButton
        userId={userId}
        userEmail={userEmail}
        deleteAction={deleteAction}
        label="Delete account"
        className="btn btn-outline btn-error btn-sm"
        onDeleted={() => router.push("/admin/users")}
      />
    </div>
  );
}
