import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Gojli handles your files and data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-8">
      <h1 className="text-3xl font-semibold text-base-content sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-base-content/50">Last updated: July 14, 2026</p>

      <div className="mt-6 rounded-lg border border-base-300 bg-base-200 px-4 py-3 text-sm text-base-content/70">
        This is a general starting-point policy for Gojli. Review and adapt it (ideally with a
        lawyer) before relying on it for a live product with real users.
      </div>

      <div className="mt-8 space-y-8 text-base-content/80">
        <section>
          <h2 className="text-lg font-semibold text-base-content">Overview</h2>
          <p className="mt-2">
            Gojli (&ldquo;we&rdquo;, &ldquo;our&rdquo;) provides free PDF tools. This policy explains what
            happens to your files and data when you use the site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Files you upload</h2>
          <p className="mt-2">
            Tools that run entirely in your browser (merge, split, rotate, watermark, JPG to PDF, and
            similar) never send your files anywhere — they&apos;re processed locally on your device
            and disappear when you close or refresh the tab.
          </p>
          <p className="mt-2">
            Some tools (for example, converting between PDF and Word, Excel, or PowerPoint) require
            server-side processing. For those tools, your file is sent only for the purpose of
            performing that conversion and is not used for any other purpose or shared with third
            parties. Once support for these tools ships, this section will be updated with the exact
            retention window.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Cookies & analytics</h2>
          <p className="mt-2">
            Gojli does not currently use tracking cookies or third-party analytics. If that changes,
            this policy will be updated to describe what&apos;s collected and why.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Third-party services</h2>
          <p className="mt-2">
            We don&apos;t sell or share your data with third parties. If a future tool relies on a
            third-party service to work, that will be disclosed here.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Children&apos;s privacy</h2>
          <p className="mt-2">Gojli is not directed at children under 13 and does not knowingly collect their data.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Changes to this policy</h2>
          <p className="mt-2">
            We may update this policy as the product changes. Material changes will be reflected by
            updating the &ldquo;Last updated&rdquo; date above.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Contact us</h2>
          <p className="mt-2">Questions about this policy? Reach out at [add your contact email here].</p>
        </section>
      </div>
    </div>
  );
}
