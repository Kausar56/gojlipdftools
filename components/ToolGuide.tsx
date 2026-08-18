export function ToolGuide({ title, guideHtml }: { title: string; guideHtml: string }) {
  return (
    <article>
      <h2 className="text-xl font-semibold text-base-content sm:text-2xl">{title}</h2>
      <div
        className="prose prose-sm mt-3 max-w-2xl text-base-content/70 dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: guideHtml }}
      />
    </article>
  );
}
