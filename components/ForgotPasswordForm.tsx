"use client";

import { useState } from "react";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [notice, setNotice] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setNotice("Accounts aren't live yet — check back soon!");
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
          <input type="email" required placeholder="you@example.com" className="input input-bordered mt-1.5 w-full" />
        </label>

        {notice && <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">{notice}</p>}

        <button type="submit" className="btn btn-primary mt-2">
          Send Reset Link
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
