"use client";

import { useCallback, useRef, useState } from "react";
import { RichTextEditor } from "./RichTextEditor";
import { ToolIcon } from "./icons";
import { uploadImageViaSignedEndpoint } from "@/lib/uploadImageClient";
import type { Tool } from "@/lib/tools";
import type { EffectiveToolContent } from "@/lib/toolContent";

type FaqState = { id: string; question: string; answerHtml: string };

export function ToolContentEditor({
  tool,
  initialContent,
  hasOverride,
  updateAction,
  resetAction,
}: {
  tool: Tool;
  initialContent: EffectiveToolContent;
  hasOverride: boolean;
  updateAction: (formData: FormData) => void | Promise<void>;
  resetAction: () => void | Promise<void>;
}) {
  // Stable per-row ids (not array index) — FAQs can be reordered, and
  // RichTextEditor is uncontrolled (only reads defaultValue once on mount),
  // so keying by index would leave a reordered row's editor still showing
  // its old content after a move instead of the swapped-in row's content.
  const nextId = useRef(0);
  const makeId = () => `new-${nextId.current++}`;

  const [guideTitle, setGuideTitle] = useState(initialContent.guideTitle);
  const [guideHtml, setGuideHtml] = useState(initialContent.guideHtml);
  const [faqs, setFaqs] = useState<FaqState[]>(() =>
    initialContent.faqs.map((faq, i) => ({ id: `initial-faq-${i}`, question: faq.question, answerHtml: faq.answerHtml })),
  );
  const [uploadError, setUploadError] = useState("");

  // useCallback (not a fresh closure per render) — RichTextEditor tears down
  // and recreates the whole Quill instance whenever this reference changes,
  // which would reset the cursor/undo history on every keystroke otherwise.
  const handleImageUpload = useCallback(async (file: File) => {
    setUploadError("");
    try {
      const { url } = await uploadImageViaSignedEndpoint(file, "/api/admin/tool-content/upload-signature");
      return url;
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Couldn't upload the image.");
      throw error;
    }
  }, []);

  function addFaq() {
    setFaqs((prev) => [...prev, { id: makeId(), question: "", answerHtml: "" }]);
  }
  function removeFaq(id: string) {
    setFaqs((prev) => prev.filter((faq) => faq.id !== id));
  }
  function updateFaq(id: string, patch: Partial<FaqState>) {
    setFaqs((prev) => prev.map((faq) => (faq.id === id ? { ...faq, ...patch } : faq)));
  }
  function moveFaq(index: number, direction: -1 | 1) {
    setFaqs((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <form action={updateAction} className="space-y-8">
        <input type="hidden" name="guideHtml" value={guideHtml} />

        <div>
          <h2 className="text-sm font-semibold text-base-content/80">Guide</h2>
          <p className="mt-1 text-xs text-base-content/50">The heading and article shown below this tool.</p>
          <input
            type="text"
            name="guideTitle"
            value={guideTitle}
            onChange={(event) => setGuideTitle(event.target.value)}
            placeholder={`How ${tool.name} works`}
            className="input input-bordered input-sm mt-2 w-full"
          />
          <div className="mt-2">
            <RichTextEditor
              defaultValue={guideHtml}
              onChange={setGuideHtml}
              onImageUpload={handleImageUpload}
              placeholder="Explain how to use this tool..."
              size="lg"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-base-content/80">FAQs</h2>
            <button type="button" onClick={addFaq} className="btn btn-ghost btn-xs">
              <ToolIcon name="plus" className="h-3.5 w-3.5" />
              Add FAQ
            </button>
          </div>

          <div className="mt-2 space-y-4">
            {faqs.length === 0 && <p className="text-xs text-base-content/50">No FAQs yet.</p>}
            {faqs.map((faq, index) => (
              <div key={faq.id} className="rounded-lg border border-base-300 bg-base-100 p-3">
                <input type="hidden" name="faqAnswerHtml" value={faq.answerHtml} />
                <div className="flex items-center justify-between gap-2">
                  <span className="badge badge-neutral badge-sm">FAQ {index + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveFaq(index, -1)}
                      disabled={index === 0}
                      className="btn btn-ghost btn-xs btn-square"
                      aria-label="Move FAQ up"
                    >
                      <ToolIcon name="chevron-down" className="h-3.5 w-3.5 rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFaq(index, 1)}
                      disabled={index === faqs.length - 1}
                      className="btn btn-ghost btn-xs btn-square"
                      aria-label="Move FAQ down"
                    >
                      <ToolIcon name="chevron-down" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFaq(faq.id)}
                      className="btn btn-ghost btn-xs btn-square text-error"
                      aria-label="Remove FAQ"
                    >
                      <ToolIcon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  name="faqQuestion"
                  value={faq.question}
                  onChange={(event) => updateFaq(faq.id, { question: event.target.value })}
                  placeholder="Question"
                  className="input input-bordered input-sm mt-2 w-full"
                />
                <div className="mt-2">
                  <RichTextEditor
                    defaultValue={faq.answerHtml}
                    onChange={(html) => updateFaq(faq.id, { answerHtml: html })}
                    onImageUpload={handleImageUpload}
                    placeholder="Answer..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {uploadError && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{uploadError}</p>}

        <button type="submit" className="btn btn-primary w-full">
          Save Changes
        </button>
      </form>

      {hasOverride && (
        <form
          action={resetAction}
          onSubmit={(event) => {
            if (!window.confirm(`Reset "${tool.name}" back to its default guide/FAQ content? This can't be undone.`)) {
              event.preventDefault();
            }
          }}
        >
          <button type="submit" className="btn btn-outline btn-error btn-sm w-full">
            Reset to Default Content
          </button>
        </form>
      )}
    </div>
  );
}
