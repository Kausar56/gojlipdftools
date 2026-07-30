import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPageLayout } from "@/components/AuthPageLayout";
import { LoginForm } from "@/components/LoginForm";
import { createClient } from "@/lib/supabase/server";

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

export default async function LoginPage() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/dashboard");
  } catch {
    // Supabase env vars aren't set up yet — treat as logged out below.
  }

  return (
    <AuthPageLayout>
      <LoginForm />
    </AuthPageLayout>
  );
}
