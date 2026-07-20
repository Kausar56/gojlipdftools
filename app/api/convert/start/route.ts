import { NextResponse } from "next/server";
import { getCloudConvert } from "@/lib/cloudconvert";

export async function POST(request: Request) {
  let inputFormat: string;
  let outputFormat: string;
  let filename: string;

  try {
    const body = await request.json();
    inputFormat = String(body.inputFormat ?? "");
    outputFormat = String(body.outputFormat ?? "");
    filename = String(body.filename ?? "file");
    if (!inputFormat || !outputFormat) {
      return NextResponse.json({ error: "Missing inputFormat/outputFormat." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const cloudConvert = getCloudConvert();

    const job = await cloudConvert.jobs.create({
      tasks: {
        "import-file": { operation: "import/upload" },
        "convert-file": {
          operation: "convert",
          input: "import-file",
          input_format: inputFormat,
          output_format: outputFormat,
          filename,
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
