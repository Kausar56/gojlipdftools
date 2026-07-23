"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) {
        setErrorMessage(error.message);
        setStatus("idle");
        return;
      }
      setStatus("sent");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Couldn't send the reset link right now.");
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div className="card border border-base-300 bg-base-100 p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-base-content">Check your email</h1>
        <p className="mt-2 text-sm text-base-content/60">
          If an account exists for <span className="font-medium text-base-content">{email}</span>, a password
          reset link is on its way.
        </p>
      </div>
    );
  }

  return (
    <div className="card border border-base-300 bg-base-100 p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-base-content">Reset your password</h1>
      <p className="mt-1 text-sm text-base-content/60">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <label className="block text-sm font-medium text-base-content">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="input input-bordered mt-1.5 w-full"
          />
        </label>

        {errorMessage && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>}

        <button type="submit" disabled={status === "submitting"} className="btn btn-primary mt-2">
          {status === "submitting" ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-base-content/60">
        Remembered your password?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
