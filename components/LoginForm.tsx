"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getAuthRedirectOrigin } from "@/lib/authRedirect";
import { GoogleIcon } from "./GoogleIcon";
import { PasswordField } from "./PasswordField";

// Supabase deliberately returns the same generic error for a wrong password
// and for an email with no account, so this can't say which one is off
// without a separate lookup — this just makes the wording clearer than
// Supabase's raw "Invalid login credentials".
function describeLoginError(message: string): string {
  return /invalid login credentials/i.test(message) ? "Incorrect email or password. Please try again." : message;
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleGoogleLogin() {
    setErrorMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${getAuthRedirectOrigin()}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMessage(describeLoginError(error.message));
        setStatus("idle");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Couldn't log in right now.");
      setStatus("idle");
    }
  }

  return (
    <div className="card border border-base-300 bg-base-100 p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-base-content">Log in to Gojli</h1>
      <p className="mt-1 text-sm text-base-content/60">Welcome back. Pick up right where you left off.</p>

      <button type="button" onClick={handleGoogleLogin} className="btn btn-outline mt-6 w-full gap-2">
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

        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="current-password"
          extraLabel={
            <Link href="/forgot-password" className="text-xs font-normal text-primary hover:underline">
              Forgot password?
            </Link>
          }
        />

        {errorMessage && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>}

        <button type="submit" disabled={status === "submitting"} className="btn btn-primary mt-2">
          {status === "submitting" ? "Logging in..." : "Log In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-base-content/60">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
