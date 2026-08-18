import { htmlToPlainText, type EffectiveToolContent } from "@/lib/toolContent";

export function ToolFaq({ faqs }: { faqs: EffectiveToolContent["faqs"] }) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: htmlToPlainText(faq.answerHtml),
      },
    })),
  };

  return (
    <section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <h2 className="text-xl font-semibold text-base-content">Frequently asked questions</h2>
      <div className="mt-5 space-y-3">
        {faqs.map((faq, index) => (
          <div key={index} className="collapse collapse-arrow border border-base-300 bg-base-100">
            <input type="checkbox" />
            <div className="collapse-title text-sm font-medium text-base-content">{faq.question}</div>
            <div
              className="collapse-content prose prose-sm max-w-none text-base-content/70 dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: faq.answerHtml }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
