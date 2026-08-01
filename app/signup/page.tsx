import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPageLayout } from "@/components/AuthPageLayout";
import { SignupForm } from "@/components/SignupForm";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safeRedirect";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a free Gojli account.",
};

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const redirectTarget = safeRedirectPath((await searchParams).redirect, "/dashboard");

  // redirect() works by throwing internally — calling it *inside* the try
  // block let a bare `catch` swallow that throw along with real Supabase
  // errors, silently cancelling the redirect and rendering the signup form
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
      <SignupForm redirectTo={redirectTarget} />
    </AuthPageLayout>
  );
}
