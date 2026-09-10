import { ToolIcon } from "./icons";
import type { PricingPlan } from "@/lib/pricingPlans";
import type { ComparisonRow, ComparisonCellValue } from "@/lib/pricingComparison";

function Cell({ value }: { value: ComparisonCellValue | undefined }) {
  if (value === undefined) return null;
  if (typeof value === "string") {
    return <span className="text-sm text-base-content/80">{value}</span>;
  }
  return value ? (
    <ToolIcon name="check" className="mx-auto h-4 w-4 text-secondary" />
  ) : (
    <span className="text-base-content/30">—</span>
  );
}

export function PricingTable({ plans, rows }: { plans: PricingPlan[]; rows: ComparisonRow[] }) {
  if (plans.length === 0 || rows.length === 0) return null;

  return (
    <div className="bg-base-100 py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-8">
        <h2 className="text-center text-2xl font-semibold text-base-content sm:text-3xl">Compare plans</h2>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-150 text-left">
            <thead>
              <tr className="border-b border-base-300">
                <th className="py-3 pr-4 text-sm font-medium text-base-content/60">Feature</th>
                {plans.map((plan) => (
                  <th
                    key={plan.id}
                    className={`px-4 py-3 text-center text-sm font-semibold ${plan.highlighted ? "text-primary" : "text-base-content"}`}
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-base-300/60">
                  <td className="py-3 pr-4 text-sm text-base-content/80">{row.feature}</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="px-4 py-3 text-center">
                      <Cell value={row.values[plan.id]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
