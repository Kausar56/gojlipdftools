"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Whether any Supabase auth user is registered with this email. Used to show
 * "Account not found" on the forgot-password page instead of Supabase's
 * default silent no-op for unknown emails — a deliberate product choice that
 * trades away email-enumeration resistance for a clearer user experience.
 *
 * `listUsers` has no email filter in supabase-js, so this pages through all
 * users (same approach already used by lib/userAdmin.ts's admin users list).
 */
export async function checkEmailHasAccount(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const admin = createAdminClient();
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    if (data.users.some((user) => user.email?.toLowerCase() === normalized)) return true;
    if (data.users.length < perPage) return false;
    page += 1;
  }
}
