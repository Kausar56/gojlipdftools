import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { getPricingPlansForEdit } from "@/lib/pricingPlans";
import { getComparisonRowsForEdit } from "@/lib/pricingComparison";
import { ToolIcon } from "@/components/icons";
import { PricingComparisonEditor } from "@/components/PricingComparisonEditor";
import { saveComparisonRowsAction } from "./actions";

export const metadata: Metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

export default async function PricingPlansListPage() {
  const { access } = await getCurrentViewerAccess();
  if (access.kind !== "admin") redirect("/admin/blog");

  const [plans, comparisonRows] = await Promise.all([getPricingPlansForEdit(), getComparisonRowsForEdit()]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-base-content">Pricing</h1>
          <p className="mt-1 text-sm text-base-content/60">
            Plans and prices shown on <code>/pricing</code>. Changing a plan here only changes what&apos;s
            displayed — checkout still charges whatever amount the Paddle Price ID is set to.
          </p>
        </div>
        <Link href="/admin/pricing/new" className="btn btn-primary btn-sm shrink-0">
          <ToolIcon name="plus" className="h-4 w-4" />
          New Plan
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-base-300">
        <table className="w-full text-left text-sm">
          <thead className="bg-base-200 text-xs text-base-content/60">
            <tr>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Monthly</th>
              <th className="px-4 py-2 font-medium">Yearly</th>
              <th className="px-4 py-2 font-medium">Paddle Prices</th>
              <th className="px-4 py-2 font-medium">Order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-300">
            {plans.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-base-content/50">
                  No plans yet — run <code>docs/pricing-plans-schema.sql</code>, or click &quot;New Plan&quot;.
                </td>
              </tr>
            )}
            {plans.map((plan) => {
              const hasCheckout = Boolean(plan.monthlyPriceId || plan.yearlyPriceId);
              return (
                <tr key={plan.id} className="hover:bg-base-200/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/pricing/${plan.id}`} className="font-medium text-primary hover:underline">
                      {plan.name}
                    </Link>
                    {plan.highlighted && <span className="badge badge-primary badge-xs ml-2">Popular</span>}
                    <p className="text-xs text-base-content/50">{plan.id}</p>
                  </td>
                  <td className="px-4 py-3">${plan.monthlyPrice}</td>
                  <td className="px-4 py-3">${plan.yearlyPrice}</td>
                  <td className="px-4 py-3">
                    {hasCheckout ? (
                      <span className="badge badge-success badge-sm">Configured</span>
                    ) : plan.href ? (
                      <span className="badge badge-ghost badge-sm">Link only</span>
                    ) : (
                      <span className="badge badge-warning badge-sm">Not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-base-content/60">{plan.displayOrder}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-base-content">Compare Plans Table</h2>
        <p className="mt-1 text-sm text-base-content/60">
          The feature-comparison table shown below the plan cards on <code>/pricing</code>. Columns always
          match the plans above, in the same order.
        </p>
        <div className="mt-4">
          <PricingComparisonEditor plans={plans} initialRows={comparisonRows} saveAction={saveComparisonRowsAction} />
        </div>
      </div>
    </div>
  );
}
