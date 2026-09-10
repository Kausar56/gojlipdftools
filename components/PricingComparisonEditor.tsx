"use client";

import { useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { ToolIcon } from "./icons";
import { describeError } from "@/lib/errorHelpers";
import type { PricingPlan } from "@/lib/pricingPlans";
import type { ComparisonRow } from "@/lib/pricingComparison";

type RowState = { key: string; id: number | null; feature: string; cells: Record<string, string> };

// A comparison cell is stored as boolean | string (lib/pricingComparison.ts)
// but edited here as plain text, so the admin doesn't need a separate
// type-picker per cell — "yes"/"no" (case-insensitive) map to a checkmark/
// dash, anything else is shown as literal text (e.g. "200 MB"), and blank
// means "not shown for this plan".
function cellValueToText(value: boolean | string | undefined): string {
  if (value === undefined) return "";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return value;
}

export function PricingComparisonEditor({
  plans,
  initialRows,
  saveAction,
}: {
  plans: PricingPlan[];
  initialRows: ComparisonRow[];
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const nextKey = useRef(0);
  const makeKey = () => `new-${nextKey.current++}`;

  const [rows, setRows] = useState<RowState[]>(() =>
    initialRows.map((row) => ({
      key: `initial-${row.id}`,
      id: row.id,
      feature: row.feature,
      cells: Object.fromEntries(plans.map((plan) => [plan.id, cellValueToText(row.values[plan.id])])),
    })),
  );
  const [isSaving, startSaving] = useTransition();

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: makeKey(), id: null, feature: "", cells: Object.fromEntries(plans.map((plan) => [plan.id, ""])) },
    ]);
  }
  function removeRow(key: string) {
    setRows((prev) => prev.filter((row) => row.key !== key));
  }
  function updateRow(key: string, patch: Partial<RowState>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }
  function updateCell(key: string, planId: string, value: string) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, cells: { ...row.cells, [planId]: value } } : row)));
  }
  function moveRow(index: number, direction: -1 | 1) {
    setRows((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(async () => {
      try {
        const formData = new FormData();
        for (const row of rows) {
          formData.append("rowId", row.id === null ? "" : String(row.id));
          formData.append("rowFeature", row.feature);
          for (const plan of plans) {
            formData.append(`cell__${plan.id}`, row.cells[plan.id] ?? "");
          }
        }
        await saveAction(formData);
        toast.success("Comparison table saved.");
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't save the comparison table."));
      }
    });
  }

  if (plans.length === 0) {
    return <p className="text-sm text-base-content/50">Add at least one plan above before editing the comparison table.</p>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <p className="text-xs text-base-content/50">
        Per cell: <code>yes</code>/<code>no</code> for a checkmark/dash, any other text (e.g. &quot;200 MB&quot;)
        shows as-is, blank hides the cell.
      </p>

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="w-full min-w-150 text-left text-sm">
          <thead className="bg-base-200 text-xs text-base-content/60">
            <tr>
              <th className="w-64 px-3 py-2 font-medium">Feature</th>
              {plans.map((plan) => (
                <th key={plan.id} className="px-3 py-2 font-medium">
                  {plan.name}
                </th>
              ))}
              <th className="w-28 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-300">
            {rows.map((row, index) => (
              <tr key={row.key}>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.feature}
                    onChange={(event) => updateRow(row.key, { feature: event.target.value })}
                    placeholder="e.g. Max file size"
                    className="input input-bordered input-sm w-full"
                  />
                </td>
                {plans.map((plan) => (
                  <td key={plan.id} className="px-3 py-2">
                    <input
                      type="text"
                      value={row.cells[plan.id] ?? ""}
                      onChange={(event) => updateCell(row.key, plan.id, event.target.value)}
                      placeholder="yes / no / text"
                      className="input input-bordered input-sm w-full"
                    />
                  </td>
                ))}
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => moveRow(index, -1)}
                      disabled={index === 0}
                      className="btn btn-ghost btn-xs btn-square"
                      aria-label="Move up"
                    >
                      <ToolIcon name="chevron-down" className="h-3.5 w-3.5 rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRow(index, 1)}
                      disabled={index === rows.length - 1}
                      className="btn btn-ghost btn-xs btn-square"
                      aria-label="Move down"
                    >
                      <ToolIcon name="chevron-down" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="btn btn-ghost btn-xs btn-square text-error"
                      aria-label="Remove row"
                    >
                      <ToolIcon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={plans.length + 2} className="px-3 py-6 text-center text-base-content/50">
                  No rows yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={addRow} className="btn btn-ghost btn-xs">
          <ToolIcon name="plus" className="h-3.5 w-3.5" />
          Add Row
        </button>
        <button type="submit" disabled={isSaving} className="btn btn-primary btn-sm">
          {isSaving ? "Saving..." : "Save Comparison Table"}
        </button>
      </div>
    </form>
  );
}
