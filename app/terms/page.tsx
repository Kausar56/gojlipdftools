import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Gojli.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-8">
      <h1 className="text-3xl font-semibold text-base-content sm:text-4xl">Terms of Service</h1>
      <p className="mt-2 text-sm text-base-content/50">Last updated: July 14, 2026</p>

      <div className="mt-6 rounded-lg border border-base-300 bg-base-200 px-4 py-3 text-sm text-base-content/70">
        This is a general starting-point terms document for Gojli. Review and adapt it (ideally
        with a lawyer) before relying on it for a live product with real users.
      </div>

      <div className="mt-8 space-y-8 text-base-content/80">
        <section>
          <h2 className="text-lg font-semibold text-base-content">Acceptance of terms</h2>
          <p className="mt-2">
            By using Gojli, you agree to these Terms of Service. If you don&apos;t agree, please
            don&apos;t use the site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Description of service</h2>
          <p className="mt-2">
            Gojli provides free tools to merge, split, compress, convert, and otherwise work with
            PDF files. Some tools run entirely in your browser; others may require sending a file to
            a server for processing (see our{" "}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>{" "}
            for details).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Acceptable use</h2>
          <p className="mt-2">
            You agree not to use Gojli to process files you don&apos;t have the legal right to use,
            or for any unlawful purpose, including uploading malware or attempting to disrupt the
            service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">No warranty</h2>
          <p className="mt-2">
            Gojli is provided &ldquo;as is&rdquo;, without warranties of any kind. We don&apos;t
            guarantee the service will be uninterrupted, error-free, or fit for any particular
            purpose. Always keep a backup of your original files before processing them.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Limitation of liability</h2>
          <p className="mt-2">
            To the fullest extent permitted by law, Gojli and its operators aren&apos;t liable for
            any indirect, incidental, or consequential damages arising from your use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Changes to the service or terms</h2>
          <p className="mt-2">
            We may update these terms or change the service at any time. Continued use after changes
            means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Contact us</h2>
          <p className="mt-2">Questions about these terms? Reach out at [add your contact email here].</p>
        </section>
      </div>
    </div>
  );
}
