import type { Metadata } from "next";
import { PricingSection } from "@/components/PricingSection";
import { PricingTable } from "@/components/PricingTable";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for Gojli's PDF tools — start free, upgrade when you need more.",
};

export default function PricingPage() {
  return (
    <div>
      <PricingSection />
      <PricingTable />
    </div>
  );
}
