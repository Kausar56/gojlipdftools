import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { PricingPlanEditor } from "@/components/PricingPlanEditor";
import { createPricingPlan } from "../actions";

export const metadata: Metadata = { title: "New Plan" };
export const dynamic = "force-dynamic";

export default async function NewPricingPlanPage() {
  const { access } = await getCurrentViewerAccess();
  if (access.kind !== "admin") redirect("/admin/blog");

  return (
    <div>
      <Link href="/admin/pricing" className="text-xs text-primary hover:underline">
        ← Back to all plans
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-base-content">New Plan</h1>

      <div className="mt-6 max-w-2xl">
        <PricingPlanEditor initialPlan={null} saveAction={createPricingPlan} />
      </div>
    </div>
  );
}
