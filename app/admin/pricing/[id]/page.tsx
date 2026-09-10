import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { getPricingPlanForEdit } from "@/lib/pricingPlans";
import { PricingPlanEditor } from "@/components/PricingPlanEditor";
import { updatePricingPlan, deletePricingPlanAction } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: id };
}

export default async function EditPricingPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { access } = await getCurrentViewerAccess();
  if (access.kind !== "admin") redirect("/admin/blog");

  const plan = await getPricingPlanForEdit(id);
  if (!plan) notFound();

  return (
    <div>
      <Link href="/admin/pricing" className="text-xs text-primary hover:underline">
        ← Back to all plans
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-base-content">{plan.name}</h1>

      <div className="mt-6 max-w-2xl">
        <PricingPlanEditor
          initialPlan={plan}
          saveAction={updatePricingPlan.bind(null, id)}
          deleteAction={deletePricingPlanAction.bind(null, id)}
        />
      </div>
    </div>
  );
}
