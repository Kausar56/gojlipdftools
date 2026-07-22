"use client";

import { useState } from "react";
import Link from "next/link";
import { ToolIcon } from "./icons";

type Plan = {
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  cta: string;
  href?: string;
  highlighted?: boolean;
  features: string[];
};

const plans: Plan[] = [
  {
    name: "Free",
    tagline: "For everyday PDF tasks",
    monthlyPrice: 0,
    yearlyPrice: 0,
    cta: "Get Started",
    href: "/#tools",
    features: [
      "Unlimited use of all core PDF tools",
      "Merge, split, compress, rotate, watermark",
      "Password protect and unlock PDFs",
      "Files up to 25 MB",
      "No account required",
    ],
  },
  {
    name: "Pro",
    tagline: "For frequent, heavier workloads",
    monthlyPrice: 9,
    yearlyPrice: 90,
    cta: "Coming soon",
    highlighted: true,
    features: [
      "Everything in Free",
      "Files up to 200 MB",
      "Word, Excel, and PowerPoint conversions",
      "Batch processing for multiple files",
      "Priority processing",
      "Email support",
    ],
  },
  {
    name: "Business",
    tagline: "For teams and organizations",
    monthlyPrice: 29,
    yearlyPrice: 290,
    cta: "Coming soon",
    features: [
      "Everything in Pro",
      "Up to 10 team members",
      "Files up to 1 GB",
      "Custom watermark branding",
      "Priority phone and email support",
      "Usage analytics dashboard",
    ],
  },
];

export function PricingSection() {
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
            return (
              <div
                key={plan.name}
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
                  <span className="text-3xl font-bold text-base-content">${price}</span>
                  <span className="text-sm text-base-content/60">
                    {price === 0 ? "" : yearly ? "/year" : "/month"}
                  </span>
                </p>

                <ul className="mt-5 flex-1 space-y-2.5 text-sm text-base-content/80">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <ToolIcon name="check" className="h-4 w-4 flex-none text-secondary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.href ? (
                  <Link
                    href={plan.href}
                    className={`btn mt-6 ${plan.highlighted ? "btn-primary" : "btn-outline btn-primary"}`}
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Billing isn't live yet"
                    className={`btn mt-6 ${plan.highlighted ? "btn-primary" : "btn-outline"}`}
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

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
