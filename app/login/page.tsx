import type { Metadata } from "next";
import { AuthPageLayout } from "@/components/AuthPageLayout";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your Gojli account.",
};

export default function LoginPage() {
  return (
    <AuthPageLayout>
      <LoginForm />
    </AuthPageLayout>
  );
}
