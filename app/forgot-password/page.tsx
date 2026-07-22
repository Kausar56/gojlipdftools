import type { Metadata } from "next";
import { AuthPageLayout } from "@/components/AuthPageLayout";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset the password for your Gojli account.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageLayout>
      <ForgotPasswordForm />
    </AuthPageLayout>
  );
}
