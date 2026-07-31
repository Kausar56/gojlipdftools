import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPageLayout } from "@/components/AuthPageLayout";
import { SignupForm } from "@/components/SignupForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a free Gojli account.",
};

export const dynamic = "force-dynamic";

export default async function SignupPage() {
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
  if (isLoggedIn) redirect("/dashboard");

  return (
    <AuthPageLayout>
      <SignupForm />
    </AuthPageLayout>
  );
}
