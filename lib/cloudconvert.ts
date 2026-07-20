import CloudConvert from "cloudconvert";

let client: CloudConvert | null = null;

export function getCloudConvert(): CloudConvert {
  const apiKey = process.env.CLOUDCONVERT_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Conversion isn't configured yet — CLOUDCONVERT_API_KEY is missing on the server.",
    );
  }
  if (!client) {
    client = new CloudConvert(apiKey);
  }
  return client;
}
