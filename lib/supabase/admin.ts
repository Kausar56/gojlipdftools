import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses Row Level Security entirely, so it can read
 * every user's data instead of just the caller's own (which is all the
 * regular per-request client in `server.ts` can see). Server-only: never
 * import this from a Client Component, and never let the key reach the
 * browser bundle (no `NEXT_PUBLIC_` prefix, ever).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Admin access isn't configured yet — SUPABASE_SERVICE_ROLE_KEY is missing on the server.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
