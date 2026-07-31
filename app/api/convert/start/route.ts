import { NextResponse } from "next/server";
import { getCloudConvert } from "@/lib/cloudconvert";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits, getUserPlan, getMonthlyUsageCount, recordUsage } from "@/lib/usageLimits";

export async function POST(request: Request) {
  let mode: "convert" | "optimize";
  let inputFormat: string;
  let outputFormat: string;
  let profile: string;
  let filename: string;
  let fileSizeBytes: number;

  try {
    const body = await request.json();
    mode = body.mode === "optimize" ? "optimize" : "convert";
    inputFormat = String(body.inputFormat ?? "");
    outputFormat = String(body.outputFormat ?? "");
    profile = String(body.profile ?? "web");
    filename = String(body.filename ?? "file");
    fileSizeBytes = Number(body.fileSizeBytes ?? 0);
    if (!inputFormat) {
      return NextResponse.json({ error: "Missing inputFormat." }, { status: 400 });
    }
    if (mode === "convert" && !outputFormat) {
      return NextResponse.json({ error: "Missing outputFormat." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Server-side conversions cost real money per use, so they require an account —
  // that's also what makes the monthly quota below actually enforceable.
  let supabase: Awaited<ReturnType<typeof createClient>>;
  let userId: string;
  try {
    supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json(
        { error: "Please log in to use this tool.", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }
    userId = data.user.id;
  } catch {
    return NextResponse.json(
      { error: "Please log in to use this tool.", code: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  const plan = await getUserPlan(supabase, userId);
  const limits = getPlanLimits(plan);

  const fileSizeMb = fileSizeBytes / (1024 * 1024);
  if (fileSizeBytes > 0 && fileSizeMb > limits.maxFileSizeMb) {
    return NextResponse.json(
      {
        error: `This file is ${fileSizeMb.toFixed(1)} MB, which is over the ${limits.maxFileSizeMb} MB limit for your plan. Upgrade for larger files.`,
        code: "FILE_TOO_LARGE",
      },
      { status: 413 },
    );
  }

  if (limits.monthlyConversions !== null) {
    const used = await getMonthlyUsageCount(supabase, userId);
    if (used >= limits.monthlyConversions) {
      return NextResponse.json(
        {
          error: `You've used all ${limits.monthlyConversions} conversions included in your plan this month. Upgrade for more.`,
          code: "QUOTA_EXCEEDED",
        },
        { status: 403 },
      );
    }
  }

  try {
    const cloudConvert = getCloudConvert();

    const baseName = filename.replace(/\.[^./\\]+$/, "");
    const processTask =
      mode === "optimize"
        ? {
            operation: "optimize" as const,
            input: "import-file",
            // Compression is PDF-only for now — the "optimize" task's input_format
            // union is narrower (jpg/png/pdf) than convert's plain string.
            input_format: "pdf" as const,
            profile: profile as "web" | "print" | "archive" | "mrc" | "max",
          }
        : {
            operation: "convert" as const,
            input: "import-file",
            input_format: inputFormat,
            output_format: outputFormat,
            filename: `${baseName}.${outputFormat}`,
          };

    const job = await cloudConvert.jobs.create({
      tasks: {
        "import-file": { operation: "import/upload" },
        "process-file": processTask,
        "export-file": {
          operation: "export/url",
          input: "process-file",
        },
      },
    });

    const importTask = job.tasks.find((task) => task.operation === "import/upload");
    const form = importTask?.result?.form as { url: string; parameters: Record<string, string> } | undefined;

    if (!form) {
      return NextResponse.json({ error: "Couldn't start the conversion job." }, { status: 502 });
    }

    const usageSlug = mode === "optimize" ? `${inputFormat}-optimize` : `${inputFormat}-to-${outputFormat}`;
    await recordUsage(supabase, userId, usageSlug, fileSizeBytes);

    return NextResponse.json({
      jobId: job.id,
      uploadUrl: form.url,
      uploadParameters: form.parameters,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't start the conversion job." },
      { status: 500 },
    );
  }
}
