import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPageLayout } from "@/components/AuthPageLayout";
import { LoginForm } from "@/components/LoginForm";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safeRedirect";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your Gojli account.",
};

// Checks the session per-request — an already-logged-in visitor should never
// see (or be able to submit) the login form at all. Previously they could
// land here anyway (e.g. an old bookmark or a link from before they signed
// in) and end up in the confusing state of being logged in per the navbar
// while the login form on the same page looked stuck.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const redirectTarget = safeRedirectPath((await searchParams).redirect, "/dashboard");

  // redirect() works by throwing internally — calling it *inside* the try
  // block let a bare `catch` swallow that throw along with real Supabase
  // errors, silently cancelling the redirect and rendering the login form
  // anyway even for an already-authenticated visitor. Keeping the fallible
  // Supabase call and the redirect() call in separate steps fixes that.
  let isLoggedIn = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    isLoggedIn = Boolean(data.user);
  } catch {
    // Supabase env vars aren't set up yet — treat as logged out below.
  }
  if (isLoggedIn) redirect(redirectTarget);

  return (
    <AuthPageLayout>
      <LoginForm redirectTo={redirectTarget} />
    </AuthPageLayout>
  );
}
