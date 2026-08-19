function initials(label: string) {
  const parts = label.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase() || "?";
}

/** Avatar for a ticket's owner — the real photo for Google-sign-in accounts
 *  (Supabase populates user_metadata.avatar_url automatically), otherwise a
 *  generated initials circle so there's never a broken/empty image. Plain
 *  function component (no client-only hooks) so it works from both the
 *  AdminTicketsTable Client Component and the ticket detail Server
 *  Component. */
export function UserAvatar({
  name,
  email,
  avatarUrl,
  className = "h-8 w-8",
}: {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  className?: string;
}) {
  const label = name || email || "?";
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- external avatar URL from Google, not one of our own optimized assets
    return <img src={avatarUrl} alt={label} className={`${className} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary`}
    >
      {initials(label)}
    </div>
  );
}
