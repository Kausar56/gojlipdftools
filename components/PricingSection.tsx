"use client";

import { useState } from "react";
import Link from "next/link";
import { ToolIcon } from "./icons";
import { PaddleCheckoutButton } from "./PaddleCheckoutButton";
import type { PricingPlan } from "@/lib/pricingPlans";

function formatPrice(amount: number): string {
  return Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);
}

export function PricingSection({
  plans,
  userId,
  userEmail,
  currentPlan,
}: {
  plans: PricingPlan[];
  userId: string | null;
  userEmail: string | null;
  currentPlan: string;
}) {
  const [yearly, setYearly] = useState(false);

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, var(--color-base-content) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
            maskImage: "linear-gradient(to bottom, black, black 60%, transparent)",
            opacity: 0.18,
          }}
        />

        <div className="relative mx-auto max-w-3xl px-4 pt-14 pb-16 text-center sm:px-8">
          <h1 className="text-3xl font-semibold text-base-content sm:text-4xl">Simple, transparent pricing</h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-base-content/70 sm:text-lg">
            Start free. Upgrade only when your PDF workload grows.
          </p>

          <div className="mt-7 inline-flex items-center gap-1 rounded-full border border-base-300 bg-base-100 p-1">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`btn btn-sm rounded-full ${!yearly ? "btn-primary" : "btn-ghost"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`btn btn-sm gap-2 rounded-full ${yearly ? "btn-primary" : "btn-ghost"}`}
            >
              Yearly
              <span className="badge badge-success badge-sm">Save ~17%</span>
            </button>
          </div>
        </div>

        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full text-base-200 sm:h-16"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,40 C360,100 1080,0 1440,60 L1440,100 L0,100 Z" fill="currentColor" />
        </svg>
      </section>

      <section className="relative overflow-hidden bg-base-200 pt-4 pb-20 sm:pb-24">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-8 md:grid-cols-3">
          {plans.map((plan) => {
            const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
            const priceId = yearly ? plan.yearlyPriceId : plan.monthlyPriceId;
            const isCheckoutPlan = Boolean(plan.monthlyPriceId || plan.yearlyPriceId);
            return (
              <div
                key={plan.id}
                className={`card flex flex-col bg-base-100 p-6 ${
                  plan.highlighted ? "border-2 border-primary shadow-lg" : "border border-base-300"
                }`}
              >
                {plan.highlighted ? (
                  <span className="badge badge-primary badge-sm self-start">Most popular</span>
                ) : (
                  <span className="h-5" />
                )}
                <h2 className="mt-2 text-lg font-semibold text-base-content">{plan.name}</h2>
                <p className="mt-1 text-sm text-base-content/60">{plan.tagline}</p>
                <p className="mt-4">
                  <span className="text-3xl font-bold text-base-content">${formatPrice(price)}</span>
                  <span className="text-sm text-base-content/60">
                    {price === 0 ? "" : yearly ? "/year" : "/month"}
                  </span>
                </p>
                {yearly && price > 0 && (
                  <p className="mt-0.5 text-xs text-base-content/50">
                    (${formatPrice(price / 12)}/month, billed annually)
                  </p>
                )}

                <ul className="mt-5 flex-1 space-y-2.5 text-sm text-base-content/80">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex gap-2">
                      <ToolIcon name={feature.icon ?? "check"} className={`h-4 w-4 flex-none ${feature.icon ? "text-primary" : "text-secondary"}`} />
                      {feature.text}
                    </li>
                  ))}
                </ul>

                {userId && isCheckoutPlan && currentPlan === plan.id ? (
                  <button type="button" disabled className="btn btn-outline mt-6">
                    Current Plan
                  </button>
                ) : isCheckoutPlan ? (
                  <PaddleCheckoutButton
                    planId={plan.id}
                    priceId={priceId}
                    userId={userId}
                    userEmail={userEmail}
                    className={`btn mt-6 ${plan.highlighted ? "btn-primary" : "btn-outline btn-primary"}`}
                  >
                    {plan.cta}
                  </PaddleCheckoutButton>
                ) : plan.href ? (
                  <Link
                    href={plan.href}
                    className={`btn mt-6 ${plan.highlighted ? "btn-primary" : "btn-outline btn-primary"}`}
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button type="button" disabled className="btn btn-outline mt-6">
                    {plan.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="relative mt-8 flex items-center justify-center gap-1.5 text-center text-sm text-base-content/60">
          <ToolIcon name="shield" className="h-4 w-4 text-secondary" />
          Secure checkout by Paddle &middot; Cancel anytime &middot;{" "}
          <Link href="/refund-policy" className="text-primary hover:underline">
            Refund Policy
          </Link>
        </p>

        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full text-base-100 sm:h-16"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,40 C360,100 1080,0 1440,60 L1440,100 L0,100 Z" fill="currentColor" />
        </svg>
      </section>
    </>
  );
}
