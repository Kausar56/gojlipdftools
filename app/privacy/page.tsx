import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Gojli handles your files and data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-8">
      <h1 className="text-3xl font-semibold text-base-content sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-base-content/50">Last updated: September 3, 2026</p>

      <div className="mt-6 rounded-lg border border-base-300 bg-base-200 px-4 py-3 text-sm text-base-content/70">
        This is a general starting-point policy for Gojli. Review and adapt it (ideally with a
        lawyer) before relying on it for a live product with real users.
      </div>

      <div className="mt-8 space-y-8 text-base-content/80">
        <section>
          <h2 className="text-lg font-semibold text-base-content">Overview</h2>
          <p className="mt-2">
            Gojli (operated by Gojli Ltd. — &ldquo;we&rdquo;, &ldquo;our&rdquo;) provides PDF tools.
            This policy explains what happens to your files and data when you use the site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Files you upload</h2>
          <p className="mt-2">
            Tools that run entirely in your browser (merge, split, rotate, watermark, JPG to PDF,
            OCR, and most others) never send your files anywhere — they&apos;re processed locally on
            your device and disappear when you close or refresh the tab.
          </p>
          <p className="mt-2">
            A few tools send content to a third-party service to work, only for the purpose of
            performing that specific action:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Converting between PDF and Word, Excel, or PowerPoint, and PDF compression&apos;s
              &ldquo;Advanced&rdquo; mode, upload your file to{" "}
              <a href="https://cloudconvert.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                CloudConvert
              </a>{" "}
              to perform the conversion.
            </li>
            <li>
              AI Summarize extracts your PDF&apos;s text in your browser, then sends that text (not
              the file itself) to an AI model via{" "}
              <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                OpenRouter
              </a>{" "}
              to generate a summary or answer.
            </li>
            <li>
              Blog thumbnail images (admin-uploaded, not user files) are stored via{" "}
              <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Cloudinary
              </a>
              .
            </li>
          </ul>
          <p className="mt-2">None of these files are used for any other purpose or sold to third parties.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Account, authentication &amp; email</h2>
          <p className="mt-2">
            If you create an account, your email and authentication data are handled by{" "}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Supabase
            </a>
            , which also sets a session cookie to keep you signed in. Transactional emails (ticket
            replies, welcome, password reset) are sent through a mailbox hosted by Hostinger.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Payments</h2>
          <p className="mt-2">
            Pro and Business plan payments are handled entirely by{" "}
            <a href="https://www.paddle.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Paddle.com Market Limited
            </a>
            , our merchant of record. Paddle collects and stores your payment details (card number,
            billing address) directly — Gojli never sees or stores your card details. We receive
            only your subscription status and plan from Paddle to activate your account. See{" "}
            <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Paddle&apos;s own Privacy Policy
            </a>{" "}
            for how they handle payment data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-base-content">Cookies &amp; analytics</h2>
          <p className="mt-2">
            Gojli uses a session cookie (via Supabase) to keep signed-in users logged in, and does
            not currently use tracking or third-party analytics cookies.
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
