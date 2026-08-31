import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, welcomeEmail } from "@/lib/email";

/**
 * Lands here after Google OAuth and email confirmation/reset links.
 * Exchanges the one-time `code` for a real session, then redirects onward.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Password-reset links reuse this same callback (next=/reset-password)
      // for an existing account — never treat that as a first sign-in.
      if (data.user && next !== "/reset-password") {
        await sendWelcomeEmailOnce(data.user);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

/**
 * Fires the branded welcome email exactly once per account, gated by an
 * app_metadata flag (same merge-not-replace pattern as the ban flag in
 * app/admin/users/actions.ts) so neither a later login nor a concurrent
 * request repeats it. Best-effort: a failure here must never block the
 * redirect that just confirmed the user's session.
 */
async function sendWelcomeEmailOnce(user: User) {
  if (!user.email || user.app_metadata?.welcomedAt) return;
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, welcomedAt: new Date().toISOString() },
    });
    if (error) return;

    const fullName = user.user_metadata?.full_name;
    const displayName = typeof fullName === "string" && fullName.trim() ? fullName.trim() : user.email.split("@")[0];
    const { subject, html } = welcomeEmail({ userName: displayName });
    await sendEmail({ to: user.email, subject, html });
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }
}
