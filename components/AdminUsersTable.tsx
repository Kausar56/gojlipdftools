import type { AdminStats } from "@/lib/adminStats";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function AdminUsersTable({ users }: { users: AdminStats["users"] }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-content">Users</h1>
      <p className="mt-1 text-sm text-base-content/60">Most recent {users.length} accounts.</p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-base-300 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Plan</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center text-base-content/50">
                  No users yet.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="truncate">{user.email}</td>
                  <td className="capitalize">{user.plan}</td>
                  <td>{formatDate(user.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
