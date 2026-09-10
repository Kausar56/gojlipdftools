"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/auditLog";
import { savePricingPlan, deletePricingPlan, getPricingPlanForEdit, getPricingPlansForEdit, type PlanFeature } from "@/lib/pricingPlans";
import { saveComparisonRows, type ComparisonCellValue } from "@/lib/pricingComparison";

// Pricing plans control real checkout amounts — kept admin-only (no
// moderator delegation via a granted permission), same bar as Team
// management and Settings.
async function requirePricingAccess() {
  const { user, access } = await getCurrentViewerAccess();
  if (!user || access.kind !== "admin") throw new Error("Not authorized.");
  return user;
}

function parseFeatures(formData: FormData): PlanFeature[] {
  const texts = formData.getAll("featureText").map(String);
  const icons = formData.getAll("featureIcon").map(String);
  return texts
    .map((text, i) => ({ text: text.trim(), icon: icons[i] || undefined }))
    .filter((feature) => feature.text);
}

function revalidatePricingPaths(id?: string) {
  updateTag("pricing-plans");
  updateTag("pricing-comparison-rows");
  revalidatePath("/pricing");
  revalidatePath("/admin/pricing");
  if (id) revalidatePath(`/admin/pricing/${id}`);
}

export async function createPricingPlan(formData: FormData) {
  const user = await requirePricingAccess();

  const id = String(formData.get("id") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  if (!id) throw new Error("Plan ID is required.");

  const existing = await getPricingPlanForEdit(id);
  if (existing) throw new Error(`A plan with ID "${id}" already exists.`);

  await savePricingPlan({
    id,
    name: String(formData.get("name") ?? "").trim() || id,
    tagline: String(formData.get("tagline") ?? "").trim(),
    monthlyPrice: Number(formData.get("monthlyPrice") ?? 0) || 0,
    yearlyPrice: Number(formData.get("yearlyPrice") ?? 0) || 0,
    monthlyPriceId: String(formData.get("monthlyPriceId") ?? "").trim() || null,
    yearlyPriceId: String(formData.get("yearlyPriceId") ?? "").trim() || null,
    cta: String(formData.get("cta") ?? "").trim() || "Get Started",
    href: String(formData.get("href") ?? "").trim() || null,
    highlighted: formData.get("highlighted") === "on",
    displayOrder: Number(formData.get("displayOrder") ?? 0) || 0,
    features: parseFeatures(formData),
  });

  await logAdminAction({
    actorId: user.id,
    actorEmail: user.email,
    action: "pricing_plan.create",
    targetType: "pricing_plan",
    targetId: id,
  });

  revalidatePricingPaths(id);
  redirect(`/admin/pricing/${id}`);
}

export async function updatePricingPlan(id: string, formData: FormData) {
  const user = await requirePricingAccess();

  await savePricingPlan({
    id,
    name: String(formData.get("name") ?? "").trim() || id,
    tagline: String(formData.get("tagline") ?? "").trim(),
    monthlyPrice: Number(formData.get("monthlyPrice") ?? 0) || 0,
    yearlyPrice: Number(formData.get("yearlyPrice") ?? 0) || 0,
    monthlyPriceId: String(formData.get("monthlyPriceId") ?? "").trim() || null,
    yearlyPriceId: String(formData.get("yearlyPriceId") ?? "").trim() || null,
    cta: String(formData.get("cta") ?? "").trim() || "Get Started",
    href: String(formData.get("href") ?? "").trim() || null,
    highlighted: formData.get("highlighted") === "on",
    displayOrder: Number(formData.get("displayOrder") ?? 0) || 0,
    features: parseFeatures(formData),
  });

  await logAdminAction({
    actorId: user.id,
    actorEmail: user.email,
    action: "pricing_plan.update",
    targetType: "pricing_plan",
    targetId: id,
  });

  revalidatePricingPaths(id);
}

export async function saveComparisonRowsAction(formData: FormData) {
  const user = await requirePricingAccess();

  // Reads the *current* plan list server-side (not anything the client
  // sent) so a stale/tampered submission can't inject a cell for a plan
  // that doesn't exist — matches the same field-name convention
  // (`cell__<planId>`) PricingComparisonEditor.tsx wrote them with.
  const plans = await getPricingPlansForEdit();
  const rowIds = formData.getAll("rowId").map(String);
  const rowFeatures = formData.getAll("rowFeature").map(String);
  const cellsByPlan = new Map(plans.map((plan) => [plan.id, formData.getAll(`cell__${plan.id}`).map(String)]));

  const rows = rowFeatures
    .map((feature, index) => {
      const values: Record<string, ComparisonCellValue> = {};
      for (const plan of plans) {
        const raw = (cellsByPlan.get(plan.id)?.[index] ?? "").trim();
        if (!raw) continue;
        if (raw.toLowerCase() === "yes") values[plan.id] = true;
        else if (raw.toLowerCase() === "no") values[plan.id] = false;
        else values[plan.id] = raw;
      }
      const idStr = rowIds[index];
      return {
        id: idStr ? Number(idStr) : undefined,
        feature: feature.trim(),
        displayOrder: index * 10,
        values,
      };
    })
    .filter((row) => row.feature);

  await saveComparisonRows(rows);

  await logAdminAction({
    actorId: user.id,
    actorEmail: user.email,
    action: "pricing_comparison.update",
    targetType: "pricing_comparison_rows",
  });

  revalidatePricingPaths();
}

export async function deletePricingPlanAction(id: string) {
  const user = await requirePricingAccess();

  await deletePricingPlan(id);

  await logAdminAction({
    actorId: user.id,
    actorEmail: user.email,
    action: "pricing_plan.delete",
    targetType: "pricing_plan",
    targetId: id,
  });

  revalidatePricingPaths();
  redirect("/admin/pricing");
}
