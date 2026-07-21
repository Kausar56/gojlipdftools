export type ConvertResult = {
  downloadUrl: string;
  filename: string;
};

async function validateBeforeUpload(file: File, inputFormat: string): Promise<void> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (inputFormat === "pdf") {
    const { PDFDocument } = await import("pdf-lib");
    try {
      await PDFDocument.load(bytes);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("encrypted")) {
        throw new Error(
          "This PDF is password protected. Unlock it first (use our Unlock PDF tool), then try converting again.",
        );
      }
      throw new Error("This doesn't look like a valid PDF file. Please check the file and try again.");
    }
    return;
  }

  // .docx/.xlsx/.pptx are ZIP-based — a valid file starts with the ZIP signature "PK".
  // Password-protected Office files (and legacy .doc/.xls/.ppt) don't, so this also
  // catches those before we ever spend an upload/conversion on a file that will fail.
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error(
      "This doesn't look like a valid file for this conversion. If it's password protected, remove the password first.",
    );
  }
}

export async function convertViaCloudConvert(
  file: File,
  inputFormat: string,
  outputFormat: string,
  onStatus?: (message: string) => void,
): Promise<ConvertResult> {
  onStatus?.("Checking your file...");
  await validateBeforeUpload(file, inputFormat);

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
