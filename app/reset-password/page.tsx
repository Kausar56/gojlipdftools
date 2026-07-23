import type { Metadata } from "next";
import { AuthPageLayout } from "@/components/AuthPageLayout";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Choose a new password for your Gojli account.",
};

export default function ResetPasswordPage() {
  return (
    <AuthPageLayout>
      <ResetPasswordForm />
    </AuthPageLayout>
  );
}
