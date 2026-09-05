import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Gojli's refund policy for Pro and Business plan purchases.",
};

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-8">
      <h1 className="text-3xl font-semibold text-base-content sm:text-4xl">Refund Policy</h1>
      <p className="mt-2 text-sm text-base-content/50">Last updated: September 3, 2026</p>

      <div className="mt-6 rounded-lg border border-base-300 bg-base-200 px-4 py-3 text-sm text-base-content/70">
        This is a general starting-point policy for Gojli. Review and adapt it (ideally with a
        lawyer) before relying on it for a live product with real users.
      </div>

      <div className="mt-8 space-y-8 text-base-content/80">
        <section>
          <h2 className="text-lg font-semibold text-base-content">Free tools</h2>
          <p className="mt-2">
            Every core PDF tool on Gojli is free to use and requires no payment, so there&apos;s
            nothing to refund for them.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Pro and Business plans</h2>
          <p className="mt-2">
            Payments for Pro and Business subscriptions are processed by{" "}
            <a href="https://www.paddle.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Paddle.com Market Limited
            </a>
            , our merchant of record. Gojli follows Paddle&apos;s standard buyer refund policy for
            all subscription purchases — see{" "}
            <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Paddle&apos;s Refund Policy
            </a>{" "}
            for the current terms, since Paddle (not Gojli) processes and issues all refunds.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">How to request a refund</h2>
          <p className="mt-2">
            To request a refund, reply to your Paddle purchase receipt email, or open a support
            ticket from your{" "}
            <Link href="/dashboard/tickets" className="text-primary hover:underline">
              Gojli dashboard
            </Link>{" "}
            and we&apos;ll help route it. Include your order ID (shown in your purchase
            confirmation email) so it can be located quickly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Cancellations</h2>
          <p className="mt-2">
            Canceling a subscription (available anytime from your dashboard) stops future billing
            but doesn&apos;t automatically refund the current billing period — see Paddle&apos;s
            policy above for how partial-period refunds are handled.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Contact us</h2>
          <p className="mt-2">
            Questions about this policy? Reach out at{" "}
            <a href="mailto:support@gojli.com" className="text-primary hover:underline">
              support@gojli.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
