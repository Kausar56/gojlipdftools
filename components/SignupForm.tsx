"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "./GoogleIcon";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "check-email">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleGoogleSignup() {
    setErrorMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setErrorMessage(error.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Couldn't start Google sign-in.");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setStatus("idle");
        return;
      }

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      // No session yet — the project requires confirming the email first.
      setStatus("check-email");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Couldn't create your account right now.");
      setStatus("idle");
    }
  }

  if (status === "check-email") {
    return (
      <div className="card border border-base-300 bg-base-100 p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-base-content">Check your email</h1>
        <p className="mt-2 text-sm text-base-content/60">
          We sent a confirmation link to <span className="font-medium text-base-content">{email}</span>. Click it
          to activate your account.
        </p>
      </div>
    );
  }

  return (
    <div className="card border border-base-300 bg-base-100 p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-base-content">Create your account</h1>
      <p className="mt-1 text-sm text-base-content/60">Free to start — no card required.</p>

      <button type="button" onClick={handleGoogleSignup} className="btn btn-outline mt-6 w-full gap-2">
        <GoogleIcon className="h-4 w-4" />
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-base-content/40">
        <span className="h-px flex-1 bg-base-300" />
        or
        <span className="h-px flex-1 bg-base-300" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="block text-sm font-medium text-base-content">
          Name
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            className="input input-bordered mt-1.5 w-full"
          />
        </label>

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

        <label className="block text-sm font-medium text-base-content">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            className="input input-bordered mt-1.5 w-full"
          />
        </label>

        {errorMessage && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>}

        <button type="submit" disabled={status === "submitting"} className="btn btn-primary mt-2">
          {status === "submitting" ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-base-content/60">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
