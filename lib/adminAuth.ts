/**
 * Admin access is intentionally NOT a database role or a `profiles` column —
 * it's a fixed list of emails from a server-only env var, so promoting or
 * revoking an admin is a config change (redeploy), not a data migration.
 * `ADMIN_EMAILS` must never be prefixed `NEXT_PUBLIC_` — it would otherwise
 * ship in the client bundle.
 */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}
