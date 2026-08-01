export type ConvertResult = {
  downloadUrl: string;
  filename: string;
  sizeBytes: number | null;
};

export class ConvertError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ConvertError";
    this.code = code;
  }
}

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

async function startConversionJob(startBody: Record<string, unknown>) {
  const startRes = await fetch("/api/convert/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(startBody),
  });
  if (!startRes.ok) {
    const body = await startRes.json().catch(() => ({}));
    throw new ConvertError(body.error ?? "Couldn't start the conversion.", body.code);
  }
  return startRes.json() as Promise<{ jobId: string; uploadUrl?: string; uploadParameters?: Record<string, string> }>;
}

async function pollConversionJob(jobId: string, onStatus?: (message: string) => void): Promise<ConvertResult> {
  onStatus?.("Converting...");
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const statusRes = await fetch(`/api/convert/status?jobId=${encodeURIComponent(jobId)}`);
    const data = await statusRes.json();

    if (data.status === "finished") {
      return { downloadUrl: data.downloadUrl, filename: data.filename, sizeBytes: data.sizeBytes ?? null };
    }
    if (data.status === "error") {
      throw new Error(data.error ?? "The conversion failed.");
    }
  }

  throw new Error("The conversion is taking too long. Please try again.");
}

async function runConversionJob(
  file: File,
  startBody: Record<string, unknown>,
  onStatus?: (message: string) => void,
): Promise<ConvertResult> {
  onStatus?.("Starting conversion...");
  const { jobId, uploadUrl, uploadParameters } = await startConversionJob({
    filename: file.name,
    fileSizeBytes: file.size,
    ...startBody,
  });

  onStatus?.("Uploading your file...");
  const form = new FormData();
  for (const [key, value] of Object.entries(uploadParameters ?? {})) {
    form.append(key, value);
  }
  form.append("file", file);

  const uploadRes = await fetch(uploadUrl!, { method: "POST", body: form });
  if (!uploadRes.ok) {
    throw new Error("Uploading your file to the conversion service failed.");
  }

  return pollConversionJob(jobId, onStatus);
}

export async function convertViaCloudConvert(
  file: File,
  inputFormat: string,
  outputFormat: string,
  onStatus?: (message: string) => void,
): Promise<ConvertResult> {
  onStatus?.("Checking your file...");
  await validateBeforeUpload(file, inputFormat);

  return runConversionJob(file, { mode: "convert", inputFormat, outputFormat }, onStatus);
}

export type OptimizeProfile = "web" | "print" | "archive" | "mrc" | "max";

/** Server-side PDF compression via CloudConvert's optimize task — a heavier,
 *  higher-quality alternative to the free client-side pdf-lib compressor,
 *  at the cost of uploading the file and requiring an account. */
export async function optimizePdfViaCloudConvert(
  file: File,
  profile: OptimizeProfile,
  onStatus?: (message: string) => void,
): Promise<ConvertResult> {
  onStatus?.("Checking your file...");
  await validateBeforeUpload(file, "pdf");

  return runConversionJob(file, { mode: "optimize", inputFormat: "pdf", profile }, onStatus);
}

/** Renders a live web page to PDF via CloudConvert's headless-browser
 *  "capture-website" task — unlike every other CloudConvert flow here, there's
 *  no file to upload at all: the server fetches the URL directly. */
export async function captureUrlToPdf(url: string, onStatus?: (message: string) => void): Promise<ConvertResult> {
  onStatus?.("Starting capture...");
  const { jobId } = await startConversionJob({ mode: "capture", sourceUrl: url, outputFormat: "pdf" });
  return pollConversionJob(jobId, onStatus);
}
