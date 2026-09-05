import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits, getUserPlan, getMonthlyUsageCount } from "@/lib/usageLimits";
import { DashboardContent } from "@/components/DashboardContent";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Gojli dashboard — quick access to tools, recent activity, and account settings.",
};

// This page checks the session per-request — never let it be statically cached.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (data.user) {
      const plan = await getUserPlan(supabase, data.user.id);
      const monthlyUsed = await getMonthlyUsageCount(supabase, data.user.id);
      const { data: billingRow } = await supabase
        .from("profiles")
        .select("plan_renews_at, paddle_cancel_url, paddle_update_payment_method_url")
        .eq("id", data.user.id)
        .maybeSingle();

      return (
        <DashboardContent
          user={data.user}
          plan={plan}
          monthlyUsed={monthlyUsed}
          monthlyLimit={getPlanLimits(plan).monthlyConversions}
          isBanned={data.user.app_metadata?.banned === true}
          planRenewsAt={billingRow?.plan_renews_at ?? null}
          paddleCancelUrl={billingRow?.paddle_cancel_url ?? null}
          paddleUpdatePaymentMethodUrl={billingRow?.paddle_update_payment_method_url ?? null}
        />
      );
    }
  } catch {
    // Supabase env vars aren't set up yet — treat as logged out below.
  }

  redirect("/login");
}
