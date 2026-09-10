"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ToolIcon } from "./icons";
import { describeError, isRedirectError } from "@/lib/errorHelpers";
import type { PricingPlan } from "@/lib/pricingPlans";

type FeatureState = { id: string; text: string; sparkle: boolean };

export function PricingPlanEditor({
  initialPlan,
  saveAction,
  deleteAction,
}: {
  /** null = creating a brand-new plan (id becomes an editable field);
   *  otherwise editing an existing one (id is fixed). */
  initialPlan: PricingPlan | null;
  saveAction: (formData: FormData) => Promise<void>;
  deleteAction?: () => Promise<void>;
}) {
  const router = useRouter();
  const isNew = initialPlan === null;

  const nextId = useRef(0);
  const makeId = () => `new-${nextId.current++}`;

  const [id, setId] = useState(initialPlan?.id ?? "");
  const [name, setName] = useState(initialPlan?.name ?? "");
  const [tagline, setTagline] = useState(initialPlan?.tagline ?? "");
  const [monthlyPrice, setMonthlyPrice] = useState(String(initialPlan?.monthlyPrice ?? 0));
  const [yearlyPrice, setYearlyPrice] = useState(String(initialPlan?.yearlyPrice ?? 0));
  const [monthlyPriceId, setMonthlyPriceId] = useState(initialPlan?.monthlyPriceId ?? "");
  const [yearlyPriceId, setYearlyPriceId] = useState(initialPlan?.yearlyPriceId ?? "");
  const [cta, setCta] = useState(initialPlan?.cta ?? "Get Started");
  const [href, setHref] = useState(initialPlan?.href ?? "");
  const [highlighted, setHighlighted] = useState(initialPlan?.highlighted ?? false);
  const [displayOrder, setDisplayOrder] = useState(String(initialPlan?.displayOrder ?? 0));
  const [features, setFeatures] = useState<FeatureState[]>(() =>
    (initialPlan?.features ?? []).map((feature, i) => ({
      id: `initial-${i}`,
      text: feature.text,
      sparkle: feature.icon === "sparkle",
    })),
  );

  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  function addFeature() {
    setFeatures((prev) => [...prev, { id: makeId(), text: "", sparkle: false }]);
  }
  function removeFeature(id: string) {
    setFeatures((prev) => prev.filter((feature) => feature.id !== id));
  }
  function updateFeature(id: string, patch: Partial<FeatureState>) {
    setFeatures((prev) => prev.map((feature) => (feature.id === id ? { ...feature, ...patch } : feature)));
  }
  function moveFeature(index: number, direction: -1 | 1) {
    setFeatures((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startSaving(async () => {
      try {
        await saveAction(formData);
        toast.success(isNew ? "Plan created." : "Plan saved.");
        if (!isNew) router.refresh();
      } catch (error) {
        if (isRedirectError(error)) throw error; // createPricingPlan redirects on success
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't save this plan."));
      }
    });
  }

  function handleDelete() {
    if (!deleteAction) return;
    if (!window.confirm(`Delete the "${name || id}" plan? This can't be undone and removes it from /pricing immediately.`)) return;
    startDeleting(async () => {
      try {
        await deleteAction();
      } catch (error) {
        if (isRedirectError(error)) throw error; // deletePricingPlanAction redirects on success
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't delete this plan."));
      }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        {!isNew && <input type="hidden" name="id" value={id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-base-content">
            Plan ID
            {isNew ? (
              <input
                type="text"
                name="id"
                value={id}
                onChange={(event) => setId(event.target.value)}
                placeholder="e.g. team"
                className="input input-bordered mt-1.5 w-full"
                required
              />
            ) : (
              <input type="text" value={id} disabled className="input input-bordered mt-1.5 w-full opacity-60" />
            )}
            <span className="mt-1 block text-xs text-base-content/50">
              {isNew
                ? "Lowercase, letters/numbers/hyphens only. Can't be changed after creating."
                : "Fixed — delete and recreate the plan to change this."}
            </span>
          </label>

          <label className="block text-sm font-medium text-base-content">
            Display Name
            <input
              type="text"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Pro"
              className="input input-bordered mt-1.5 w-full"
              required
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-base-content">
          Tagline
          <input
            type="text"
            name="tagline"
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
            placeholder="e.g. For frequent, heavier workloads"
            className="input input-bordered mt-1.5 w-full"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-base-content">
            Monthly Price (USD)
            <input
              type="number"
              step="0.01"
              min="0"
              name="monthlyPrice"
              value={monthlyPrice}
              onChange={(event) => setMonthlyPrice(event.target.value)}
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
          <label className="block text-sm font-medium text-base-content">
            Yearly Price (USD)
            <input
              type="number"
              step="0.01"
              min="0"
              name="yearlyPrice"
              value={yearlyPrice}
              onChange={(event) => setYearlyPrice(event.target.value)}
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
        </div>

        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
          <p className="text-sm font-medium text-base-content">Paddle Price IDs</p>
          <p className="mt-1 text-xs text-base-content/60">
            Must be real prices from Paddle Catalog → Products matching the amounts above, or checkout will
            charge a different amount than shown here. Leave both blank for a free/no-checkout plan (set
            &quot;Free plan link&quot; below instead).
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-base-content/70">
              Monthly Price ID
              <input
                type="text"
                name="monthlyPriceId"
                value={monthlyPriceId}
                onChange={(event) => setMonthlyPriceId(event.target.value)}
                placeholder="pri_..."
                className="input input-bordered input-sm mt-1 w-full font-mono"
              />
            </label>
            <label className="block text-xs font-medium text-base-content/70">
              Yearly Price ID
              <input
                type="text"
                name="yearlyPriceId"
                value={yearlyPriceId}
                onChange={(event) => setYearlyPriceId(event.target.value)}
                placeholder="pri_..."
                className="input input-bordered input-sm mt-1 w-full font-mono"
              />
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-base-content">
            Button Text
            <input
              type="text"
              name="cta"
              value={cta}
              onChange={(event) => setCta(event.target.value)}
              placeholder="e.g. Upgrade to Pro"
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
          <label className="block text-sm font-medium text-base-content">
            Free plan link (no checkout)
            <input
              type="text"
              name="href"
              value={href}
              onChange={(event) => setHref(event.target.value)}
              placeholder="e.g. /#tools"
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm font-medium text-base-content">
            <input
              type="checkbox"
              name="highlighted"
              checked={highlighted}
              onChange={(event) => setHighlighted(event.target.checked)}
              className="checkbox checkbox-sm"
            />
            Highlight as &quot;Most popular&quot;
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-base-content">
            Sort order
            <input
              type="number"
              name="displayOrder"
              value={displayOrder}
              onChange={(event) => setDisplayOrder(event.target.value)}
              className="input input-bordered input-sm w-20"
            />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-base-content/80">Features</h2>
            <button type="button" onClick={addFeature} className="btn btn-ghost btn-xs">
              <ToolIcon name="plus" className="h-3.5 w-3.5" />
              Add Feature
            </button>
          </div>

          <div className="mt-2 space-y-2">
            {features.length === 0 && <p className="text-xs text-base-content/50">No features yet.</p>}
            {features.map((feature, index) => (
              <div key={feature.id} className="flex items-center gap-2">
                <input type="hidden" name="featureIcon" value={feature.sparkle ? "sparkle" : ""} />
                <input
                  type="text"
                  name="featureText"
                  value={feature.text}
                  onChange={(event) => updateFeature(feature.id, { text: event.target.value })}
                  placeholder="e.g. Files up to 200 MB"
                  className="input input-bordered input-sm flex-1"
                />
                <label className="flex shrink-0 items-center gap-1 text-xs text-base-content/60" title="Highlight with a sparkle icon (e.g. for AI features)">
                  <input
                    type="checkbox"
                    checked={feature.sparkle}
                    onChange={(event) => updateFeature(feature.id, { sparkle: event.target.checked })}
                    className="checkbox checkbox-xs"
                  />
                  <ToolIcon name="sparkle" className="h-3.5 w-3.5" />
                </label>
                <button
                  type="button"
                  onClick={() => moveFeature(index, -1)}
                  disabled={index === 0}
                  className="btn btn-ghost btn-xs btn-square shrink-0"
                  aria-label="Move up"
                >
                  <ToolIcon name="chevron-down" className="h-3.5 w-3.5 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => moveFeature(index, 1)}
                  disabled={index === features.length - 1}
                  className="btn btn-ghost btn-xs btn-square shrink-0"
                  aria-label="Move down"
                >
                  <ToolIcon name="chevron-down" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeFeature(feature.id)}
                  className="btn btn-ghost btn-xs btn-square shrink-0 text-error"
                  aria-label="Remove"
                >
                  <ToolIcon name="trash" className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={isSaving} className="btn btn-primary w-full">
          {isSaving ? "Saving..." : isNew ? "Create Plan" : "Save Changes"}
        </button>
      </form>

      {deleteAction && (
        <button type="button" onClick={handleDelete} disabled={isDeleting} className="btn btn-outline btn-error btn-sm w-full">
          {isDeleting ? "Deleting..." : "Delete Plan"}
        </button>
      )}
    </div>
  );
}
