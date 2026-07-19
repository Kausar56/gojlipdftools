import type { Tool } from "@/lib/tools";

export function ToolFaq({ faqs }: { faqs: Tool["faqs"] }) {
  return (
    <section>
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
