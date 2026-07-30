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
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/dashboard");
  } catch {
    // Supabase env vars aren't set up yet — treat as logged out below.
  }

  return (
    <AuthPageLayout>
      <SignupForm />
    </AuthPageLayout>
  );
}
