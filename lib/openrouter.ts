import { AI_MODEL } from "./aiConfig";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * Calls OpenRouter's OpenAI-compatible chat completions endpoint. Server-only
 * — OPENROUTER_API_KEY must never reach the browser bundle.
 * Get a key at https://openrouter.ai/keys and set OPENROUTER_API_KEY.
 */
export async function callOpenRouter(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("AI features aren't configured yet — OPENROUTER_API_KEY is missing on the server.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // OpenRouter uses these purely for its own leaderboard/attribution —
      // not required for the request to work, but good practice.
      "HTTP-Referer": "https://www.gojli.com",
      "X-Title": "Gojli",
    },
    body: JSON.stringify({ model: AI_MODEL, messages, temperature: 0.3 }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(`AI request failed (${response.status}): ${bodyText.slice(0, 300) || response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("The AI didn't return a response. Please try again.");
  }
  return content;
}
