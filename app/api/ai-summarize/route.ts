import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, getMonthlyUsageCountForTool, recordUsage } from "@/lib/usageLimits";
import { getAiSummaryMonthlyLimit, AI_MAX_DOCUMENT_CHARS, AI_MAX_HISTORY_MESSAGES } from "@/lib/aiConfig";
import { callOpenRouter, type ChatMessage } from "@/lib/openrouter";

const TOOL_SLUG = "ai-summarize";

const SUMMARY_INSTRUCTION = "Please provide a concise summary of this document, covering its main points.";

function buildSystemPrompt(documentText: string): string {
  const truncated = documentText.length > AI_MAX_DOCUMENT_CHARS ? documentText.slice(0, AI_MAX_DOCUMENT_CHARS) : documentText;
  return [
    "You are a helpful assistant answering questions about a specific PDF document.",
    "Base your answers only on the document content below. If the answer isn't in the document, say so plainly instead of guessing.",
    "Keep answers concise and well-organized (use short paragraphs or bullet points where helpful).",
    "",
    'Document content:\n"""',
    truncated,
    '"""',
  ].join("\n");
}

export async function POST(request: Request) {
  let documentText: string;
  let history: ChatMessage[];
  let newMessage: string;

  try {
    const body = await request.json();
    documentText = String(body.documentText ?? "");
    newMessage = String(body.newMessage ?? "").trim();
    const rawHistory = Array.isArray(body.messages) ? body.messages : [];
    history = rawHistory
      .filter(
        (m: unknown): m is ChatMessage =>
          typeof m === "object" &&
          m !== null &&
          (m as ChatMessage).role !== undefined &&
          typeof (m as ChatMessage).content === "string",
      )
      .slice(-AI_MAX_HISTORY_MESSAGES);

    if (!documentText.trim()) {
      return NextResponse.json({ error: "No document text was provided." }, { status: 400 });
    }
    if (!newMessage) newMessage = SUMMARY_INSTRUCTION;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Every call is a real, billed OpenRouter request, so it requires an
  // account — same reasoning as the office-conversion tools in
  // app/api/convert/start/route.ts, and what makes the monthly quota below
  // actually enforceable.
  let supabase: Awaited<ReturnType<typeof createClient>>;
  let userId: string;
  try {
    supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ error: "Please log in to use this tool.", code: "AUTH_REQUIRED" }, { status: 401 });
    }
    userId = data.user.id;
  } catch {
    return NextResponse.json({ error: "Please log in to use this tool.", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const plan = await getUserPlan(supabase, userId);
  const limit = getAiSummaryMonthlyLimit(plan);
  if (limit !== null) {
    const used = await getMonthlyUsageCountForTool(supabase, userId, TOOL_SLUG);
    if (used >= limit) {
      return NextResponse.json(
        {
          error: `You've used all ${limit} AI questions included in your plan this month. Upgrade for more.`,
          code: "QUOTA_EXCEEDED",
        },
        { status: 403 },
      );
    }
  }

  try {
    const reply = await callOpenRouter([
      { role: "system", content: buildSystemPrompt(documentText) },
      ...history,
      { role: "user", content: newMessage },
    ]);

    await recordUsage(supabase, userId, TOOL_SLUG, 0);

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't get a response from the AI." },
      { status: 502 },
    );
  }
}
