import { NextResponse } from "next/server";
import { getCloudConvert } from "@/lib/cloudconvert";

export async function GET(request: Request) {
  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId." }, { status: 400 });
  }

  try {
    const cloudConvert = getCloudConvert();
    const job = await cloudConvert.jobs.get(jobId, { include: "tasks" });

    if (job.status === "error") {
      const failedTask = job.tasks.find((task) => task.status === "error");
      return NextResponse.json({
        status: "error",
        error: failedTask?.message ?? "The conversion failed.",
      });
    }

    if (job.status !== "finished") {
      return NextResponse.json({ status: "processing" });
    }

    const exportTask = job.tasks.find((task) => task.operation === "export/url");
    const file = exportTask?.result?.files?.[0];

    if (!file?.url) {
      return NextResponse.json({ status: "error", error: "No output file was produced." });
    }

    return NextResponse.json({ status: "finished", downloadUrl: file.url, filename: file.filename });
  } catch (error) {
    return NextResponse.json(
      { status: "error", error: error instanceof Error ? error.message : "Couldn't check job status." },
      { status: 500 },
    );
  }
}
