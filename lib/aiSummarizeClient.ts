export type ChatMessage = { role: "user" | "assistant"; content: string };

export class AiSummarizeError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "AiSummarizeError";
    this.code = code;
  }
}

export async function askAboutDocument(
  documentText: string,
  history: ChatMessage[],
  newMessage: string,
): Promise<string> {
  const response = await fetch("/api/ai-summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentText, messages: history, newMessage }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AiSummarizeError(body.error ?? "Couldn't get a response from the AI.", body.code);
  }
  return body.reply as string;
}
