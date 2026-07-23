import { NextResponse } from "next/server";
import { getCloudConvert } from "@/lib/cloudconvert";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits, getUserPlan, getMonthlyUsageCount, recordUsage } from "@/lib/usageLimits";

export async function POST(request: Request) {
  let inputFormat: string;
  let outputFormat: string;
  let filename: string;
  let fileSizeBytes: number;

  try {
    const body = await request.json();
    inputFormat = String(body.inputFormat ?? "");
    outputFormat = String(body.outputFormat ?? "");
    filename = String(body.filename ?? "file");
    fileSizeBytes = Number(body.fileSizeBytes ?? 0);
    if (!inputFormat || !outputFormat) {
      return NextResponse.json({ error: "Missing inputFormat/outputFormat." }, { status: 400 });
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
    const outputFilename = `${baseName}.${outputFormat}`;

    const job = await cloudConvert.jobs.create({
      tasks: {
        "import-file": { operation: "import/upload" },
        "convert-file": {
          operation: "convert",
          input: "import-file",
          input_format: inputFormat,
          output_format: outputFormat,
          filename: outputFilename,
        },
        "export-file": {
          operation: "export/url",
          input: "convert-file",
        },
      },
    });

    const importTask = job.tasks.find((task) => task.operation === "import/upload");
    const form = importTask?.result?.form as { url: string; parameters: Record<string, string> } | undefined;

    if (!form) {
      return NextResponse.json({ error: "Couldn't start the conversion job." }, { status: 502 });
    }

    await recordUsage(supabase, userId, `${inputFormat}-to-${outputFormat}`, fileSizeBytes);

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
