export type ConvertResult = {
  downloadUrl: string;
  filename: string;
};

export async function convertViaCloudConvert(
  file: File,
  inputFormat: string,
  outputFormat: string,
  onStatus?: (message: string) => void,
): Promise<ConvertResult> {
  onStatus?.("Starting conversion...");

  const startRes = await fetch("/api/convert/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, inputFormat, outputFormat }),
  });
  if (!startRes.ok) {
    const body = await startRes.json().catch(() => ({}));
    throw new Error(body.error ?? "Couldn't start the conversion.");
  }
  const { jobId, uploadUrl, uploadParameters } = await startRes.json();

  onStatus?.("Uploading your file...");
  const form = new FormData();
  for (const [key, value] of Object.entries(uploadParameters as Record<string, string>)) {
    form.append(key, value);
  }
  form.append("file", file);

  const uploadRes = await fetch(uploadUrl, { method: "POST", body: form });
  if (!uploadRes.ok) {
    throw new Error("Uploading your file to the conversion service failed.");
  }

  onStatus?.("Converting...");
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const statusRes = await fetch(`/api/convert/status?jobId=${encodeURIComponent(jobId)}`);
    const data = await statusRes.json();

    if (data.status === "finished") {
      return { downloadUrl: data.downloadUrl, filename: data.filename };
    }
    if (data.status === "error") {
      throw new Error(data.error ?? "The conversion failed.");
    }
  }

  throw new Error("The conversion is taking too long. Please try again.");
}
