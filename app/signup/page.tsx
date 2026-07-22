import type { Metadata } from "next";
import { AuthPageLayout } from "@/components/AuthPageLayout";
import { SignupForm } from "@/components/SignupForm";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a free Gojli account.",
};

export default function SignupPage() {
  return (
    <AuthPageLayout>
      <SignupForm />
    </AuthPageLayout>
  );
}
