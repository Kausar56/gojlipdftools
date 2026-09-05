import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/usageLimits";
import { PricingSection } from "@/components/PricingSection";
import { PricingTable } from "@/components/PricingTable";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for Gojli's PDF tools — start free, upgrade when you need more.",
};

// Checkout needs to know who's logged in (for Paddle's customData.userId) and
// their current plan (to show "Current Plan" instead of "Upgrade") — both
// depend on the session, so this page can't be statically cached.
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  let userId: string | null = null;
  let userEmail: string | null = null;
  let currentPlan: "free" | "pro" | "business" = "free";

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      userId = data.user.id;
      userEmail = data.user.email ?? null;
      currentPlan = await getUserPlan(supabase, data.user.id);
    }
  } catch {
    // Supabase env vars aren't set up yet — treat as logged out below.
  }

  return (
    <div>
      <PricingSection userId={userId} userEmail={userEmail} currentPlan={currentPlan} />
      <PricingTable />
    </div>
  );
}
