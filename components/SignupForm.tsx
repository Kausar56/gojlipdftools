"use client";

import { useState } from "react";
import Link from "next/link";
import { GoogleIcon } from "./GoogleIcon";

export function SignupForm() {
  const [notice, setNotice] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setNotice("Accounts aren't live yet — check back soon!");
  }

  return (
    <div className="card border border-base-300 bg-base-100 p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-base-content">Create your account</h1>
      <p className="mt-1 text-sm text-base-content/60">Free to start — no card required.</p>

      <button
        type="button"
        onClick={() => setNotice("Accounts aren't live yet — check back soon!")}
        className="btn btn-outline mt-6 w-full gap-2"
      >
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
          <input type="text" required placeholder="Your name" className="input input-bordered mt-1.5 w-full" />
        </label>

        <label className="block text-sm font-medium text-base-content">
          Email
          <input type="email" required placeholder="you@example.com" className="input input-bordered mt-1.5 w-full" />
        </label>

        <label className="block text-sm font-medium text-base-content">
          Password
          <input type="password" required placeholder="At least 8 characters" className="input input-bordered mt-1.5 w-full" />
        </label>

        {notice && <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">{notice}</p>}

        <button type="submit" className="btn btn-primary mt-2">
          Create Account
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
