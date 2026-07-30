import type { Tool } from "@/lib/tools";

export function ToolFaq({ faqs }: { faqs: Tool["faqs"] }) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <section>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <h2 className="text-xl font-semibold text-base-content">Frequently asked questions</h2>
      <div className="mt-5 space-y-3">
        {faqs.map((faq) => (
          <div key={faq.question} className="collapse collapse-arrow border border-base-300 bg-base-100">
            <input type="checkbox" />
            <div className="collapse-title text-sm font-medium text-base-content">{faq.question}</div>
            <div className="collapse-content text-sm text-base-content/70">
              <p>{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
