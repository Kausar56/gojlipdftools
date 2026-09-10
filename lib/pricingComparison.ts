import { unstable_cache } from "next/cache";
import { createAdminClient } from "./supabase/admin";

export type ComparisonCellValue = boolean | string;

export type ComparisonRow = {
  id: number;
  feature: string;
  displayOrder: number;
  // Keyed by pricing_plans.id — a plan with no key here renders blank
  // (typically a just-added plan whose column hasn't been filled in yet).
  values: Record<string, ComparisonCellValue>;
};

type ComparisonRowInput = Omit<ComparisonRow, "id"> & { id?: number };

type ComparisonRowRecord = {
  id: number;
  feature: string;
  display_order: number;
  values: Record<string, ComparisonCellValue> | null;
};

function recordToRow(row: ComparisonRowRecord): ComparisonRow {
  return {
    id: row.id,
    feature: row.feature,
    displayOrder: row.display_order,
    values: row.values ?? {},
  };
}

// Service-role client, same reasoning as lib/pricingPlans.ts — /pricing
// reads this on every render and must stay statically prerenderable.
async function readComparisonRowsFresh(): Promise<ComparisonRow[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("pricing_comparison_rows").select("*").order("display_order").order("id");
    return (data ?? []).map((row) => recordToRow(row as ComparisonRowRecord));
  } catch {
    // Table not created yet (docs/pricing-comparison-schema.sql not run) or
    // Supabase env vars missing — /pricing renders with no comparison table
    // rather than crashing.
    return [];
  }
}

function getCachedComparisonRows(): Promise<ComparisonRow[]> {
  return unstable_cache(readComparisonRowsFresh, ["pricing-comparison-rows"], {
    revalidate: 60,
    tags: ["pricing-comparison-rows"],
  })();
}

export async function getComparisonRows(): Promise<ComparisonRow[]> {
  return getCachedComparisonRows();
}

/** Admin edit screen wants the freshest rows (not the cached read used by
 *  the public /pricing page) so a save is reflected immediately. */
export async function getComparisonRowsForEdit(): Promise<ComparisonRow[]> {
  return readComparisonRowsFresh();
}

/** Replaces the *entire* row list in one go — the admin editor submits the
 *  whole table at once (add/remove/reorder all happen client-side first),
 *  same pattern as a tool's FAQ list in lib/toolContent.ts. Existing rows
 *  are matched by id where present; rows without an id (newly added in the
 *  editor) are inserted fresh, and any existing row not present in the
 *  submitted list is deleted. */
export async function saveComparisonRows(rows: ComparisonRowInput[]): Promise<void> {
  const admin = createAdminClient();

  const { data: existingRows, error: fetchError } = await admin.from("pricing_comparison_rows").select("id");
  if (fetchError) throw new Error(fetchError.message);
  const existingIds = new Set((existingRows ?? []).map((row) => row.id as number));
  const keptIds = new Set(rows.map((row) => row.id).filter((id): id is number => typeof id === "number"));

  const idsToDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (idsToDelete.length > 0) {
    const { error } = await admin.from("pricing_comparison_rows").delete().in("id", idsToDelete);
    if (error) throw new Error(error.message);
  }

  for (const [index, row] of rows.entries()) {
    const payload = {
      feature: row.feature,
      display_order: index * 10,
      values: row.values,
    };
    if (typeof row.id === "number") {
      const { error } = await admin.from("pricing_comparison_rows").update(payload).eq("id", row.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin.from("pricing_comparison_rows").insert(payload);
      if (error) throw new Error(error.message);
    }
  }
}
