"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { ToolIcon } from "./icons";
import { tools, getToolBySlug, type Tool } from "@/lib/tools";
import { getRecentToolSlugs } from "@/lib/recentTools";
import { createClient } from "@/lib/supabase/client";
import type { PlanId } from "@/lib/planLimits";

const quickTools = tools.slice(0, 8);

const planLabels: Record<PlanId, string> = {
  free: "Free plan",
  pro: "Pro plan",
  business: "Business plan",
};

export function DashboardContent({
  user,
  plan,
  monthlyUsed,
  monthlyLimit,
}: {
  user: User;
  plan: PlanId;
  monthlyUsed: number;
  monthlyLimit: number | null;
}) {
  const router = useRouter();
  const [recentTools, setRecentTools] = useState<Tool[] | null>(null);
  const [name, setName] = useState((user.user_metadata?.full_name as string | undefined) ?? "");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const slugs = getRecentToolSlugs();
    setRecentTools(slugs.map((slug) => getToolBySlug(slug)).filter((tool): tool is Tool => Boolean(tool)));
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
      setNotice(error ? error.message : "Saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't save changes right now.");
    } finally {
      setSaving(false);
    }
  }

  const displayName = name || user.email || "there";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-base-content sm:text-3xl">Welcome back, {displayName}</h1>
          <p className="mt-1 text-sm text-base-content/60">Here's what's happening with your PDF tools.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-outline">{planLabels[plan]}</span>
          {plan === "free" && (
            <Link href="/pricing" className="btn btn-primary btn-sm">
              Upgrade
            </Link>
          )}
          <button type="button" onClick={handleLogout} className="btn btn-ghost btn-sm">
            Log out
          </button>
        </div>
      </div>

      <section className="mt-6 card border border-base-300 bg-base-100 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-base-content">Office conversions this month</span>
          <span className="text-base-content/60">
            {monthlyUsed} {monthlyLimit === null ? "used" : `/ ${monthlyLimit} used`}
          </span>
        </div>
        {monthlyLimit !== null && (
          <progress
            className="progress progress-primary mt-2 w-full"
            value={Math.min(monthlyUsed, monthlyLimit)}
            max={monthlyLimit}
          />
        )}
        <p className="mt-2 text-xs text-base-content/50">
          Covers PDF ↔ Word/Excel/PowerPoint conversions, which run on a third-party server.
          Browser-only tools (merge, split, compress, etc.) are always unlimited.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-base-content">Quick actions</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickTools.map((tool) => (
            <Link
              key={tool.slug}
              href={`/${tool.slug}`}
              className="card border border-base-300 bg-base-100 p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <ToolIcon name={tool.icon} className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-medium text-base-content">{tool.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-base-content">Recently used tools</h2>
        {recentTools === null ? null : recentTools.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-base-300 px-4 py-6 text-center text-sm text-base-content/60">
            You haven't used any tools yet — pick one above to get started.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-base-300 rounded-lg border border-base-300 bg-base-100">
            {recentTools.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={`/${tool.slug}`}
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-base-200"
                >
                  <ToolIcon name={tool.icon} className="h-4 w-4 text-primary" />
                  <span className="text-base-content">{tool.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-base-content">Need help?</h2>
        <div className="mt-4 card flex flex-col gap-3 border border-base-300 bg-base-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-base-content/70">Open a support ticket and our team will get back to you.</p>
          <Link href="/dashboard/tickets" className="btn btn-primary btn-sm shrink-0">
            Create Ticket
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-base-content">Account</h2>
        <form onSubmit={handleSave} className="mt-4 card border border-base-300 bg-base-100 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-base-content">
              Name
              <input
                type="text"
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
                value={user.email ?? ""}
                disabled
                className="input input-bordered mt-1.5 w-full opacity-60"
              />
            </label>
          </div>

          {notice && <p className="mt-4 rounded-lg bg-base-200 px-3 py-2 text-sm text-base-content/70">{notice}</p>}

          <button type="submit" disabled={saving} className="btn btn-primary mt-5 self-start">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>
    </div>
  );
}
