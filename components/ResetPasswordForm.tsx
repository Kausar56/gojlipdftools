"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordField } from "./PasswordField";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords don't match.");
      return;
    }

    setStatus("submitting");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMessage(error.message);
        setStatus("idle");
        return;
      }
      setStatus("done");
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Couldn't update your password right now.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="card border border-base-300 bg-base-100 p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-base-content">Password updated</h1>
        <p className="mt-2 text-sm text-base-content/60">Taking you to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="card border border-base-300 bg-base-100 p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-base-content">Choose a new password</h1>
      <p className="mt-1 text-sm text-base-content/60">Enter a new password for your account.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          placeholder="At least 6 characters"
          autoComplete="new-password"
          minLength={6}
          showStrength
        />

        <PasswordField
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Re-enter your new password"
          autoComplete="new-password"
          minLength={6}
        />

        {errorMessage && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>}

        <button type="submit" disabled={status === "submitting"} className="btn btn-primary mt-2">
          {status === "submitting" ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
